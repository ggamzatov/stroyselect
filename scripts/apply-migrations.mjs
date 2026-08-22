import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  const envFile = path.resolve(".env.local");

  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Set it in the environment or in .env.local"
  );
}

const migrationsDir = path.resolve("infrastructure/postgres");
const baselineFile = path.join(migrationsDir, "schema.local.sql");
const files = (await readdir(migrationsDir))
  .filter((name) => /^\d{3}_.+\.sql$/.test(name))
  .sort((a, b) => a.localeCompare(b));

const client = new Client({ connectionString: databaseUrl });
await client.connect();

async function hasCoreSchema() {
  const result = await client.query(
    "SELECT to_regclass('public.projects') IS NOT NULL AS ready"
  );

  return result.rows[0]?.ready === true;
}

try {
  if (!(await hasCoreSchema())) {
    if (!existsSync(baselineFile)) {
      throw new Error(
        `Core database schema is missing and baseline was not found: ${baselineFile}`
      );
    }

    // The historical baseline was exported from Supabase, where extensions live
    // in a dedicated schema. Plain PostgreSQL installations do not create it.
    await client.query("CREATE SCHEMA IF NOT EXISTS extensions");

    // The baseline contains functions that depend on current_user_id(), which is
    // defined by our auth compatibility migration. Apply that prerequisite first.
    const authCompat = await readFile(
      path.join(migrationsDir, "000_auth_compat.sql"),
      "utf8"
    );
    process.stdout.write("Preparing auth compatibility ... ");
    await client.query(authCompat);
    console.log("OK");

    const baseline = await readFile(baselineFile, "utf8");
    process.stdout.write("Bootstrapping schema.local.sql ... ");
    await client.query(baseline);
    console.log("OK");
  }

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`Applying ${file} ... `);
    await client.query(sql);
    console.log("OK");
  }

  console.log(`Applied ${files.length} migrations`);
} finally {
  await client.end();
}
