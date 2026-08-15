import {
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import pg from "pg";

const { Pool } = pg;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const pool = new Pool({
  connectionString: requiredEnv("DATABASE_URL"),
  max: 2,
  connectionTimeoutMillis: 5_000,
});

const s3 = new S3Client({
  endpoint: requiredEnv("S3_ENDPOINT"),
  region: process.env.S3_REGION ?? "ru-1",
  credentials: {
    accessKeyId: requiredEnv("S3_ACCESS_KEY"),
    secretAccessKey: requiredEnv("S3_SECRET_KEY"),
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
});

const SOURCES = [
  {
    name: "contractor portfolio",
    bucket: "contractor-portfolio",
    query: `
      SELECT storage_path AS key
      FROM public.contractor_portfolio_files
      WHERE storage_path IS NOT NULL
    `,
  },
  {
    name: "project stage files",
    bucket: "project-files",
    query: `
      SELECT storage_path AS key
      FROM public.project_stage_files
      WHERE storage_path IS NOT NULL
    `,
  },
  {
    name: "chat attachments",
    bucket: "chat-files",
    query: `
      SELECT storage_path AS key
      FROM public.project_message_files
      WHERE storage_path IS NOT NULL
        AND COALESCE(NULLIF(storage_bucket, ''), 'chat-files') = 'chat-files'
    `,
  },
];

async function listBucketKeys(bucket) {
  const keys = new Set();
  let continuationToken;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of response.Contents ?? []) {
      if (object.Key) keys.add(object.Key);
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value));
}

function printSample(label, values) {
  if (values.length === 0) return;
  console.log(`  ${label}:`);
  for (const value of values.slice(0, 25)) {
    console.log(`    - ${value}`);
  }
  if (values.length > 25) {
    console.log(`    ... and ${values.length - 25} more`);
  }
}

function isMissingBucketError(error) {
  return (
    error &&
    typeof error === "object" &&
    (error.name === "NoSuchBucket" || error.Code === "NoSuchBucket")
  );
}

let mismatchCount = 0;
let missingBucketCount = 0;

try {
  for (const source of SOURCES) {
    const result = await pool.query(source.query);
    const dbKeys = new Set(
      result.rows
        .map((row) => String(row.key ?? "").trim())
        .filter(Boolean)
    );

    let objectKeys;

    try {
      objectKeys = await listBucketKeys(source.bucket);
    } catch (error) {
      if (!isMissingBucketError(error)) {
        throw error;
      }

      missingBucketCount += 1;
      mismatchCount += Math.max(dbKeys.size, 1);

      console.log(`\n[${source.bucket}] ${source.name}`);
      console.log(`  database references: ${dbKeys.size}`);
      console.log("  storage bucket:      MISSING");
      console.log("  action required:     create this bucket before uploads are used");
      continue;
    }

    const missingObjects = difference(dbKeys, objectKeys);
    const orphanObjects = difference(objectKeys, dbKeys);

    mismatchCount += missingObjects.length + orphanObjects.length;

    console.log(`\n[${source.bucket}] ${source.name}`);
    console.log(`  database references: ${dbKeys.size}`);
    console.log(`  storage objects:     ${objectKeys.size}`);
    console.log(`  missing in S3:       ${missingObjects.length}`);
    console.log(`  orphaned in S3:      ${orphanObjects.length}`);

    printSample("missing object keys", missingObjects);
    printSample("orphan object keys", orphanObjects);
  }

  console.log("\nStorage audit complete.");

  if (missingBucketCount > 0) {
    console.log(`Missing required buckets: ${missingBucketCount}.`);
  }

  if (mismatchCount > 0) {
    console.log(`Found ${mismatchCount} storage/database mismatches.`);
    process.exitCode = 2;
  } else {
    console.log("No storage/database mismatches found.");
  }
} finally {
  await pool.end();
  s3.destroy();
}
