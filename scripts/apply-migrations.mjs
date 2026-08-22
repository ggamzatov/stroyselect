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

async function runSqlFile(fileName, label) {
  const sql = await readFile(path.join(migrationsDir, fileName), "utf8");
  process.stdout.write(`${label} ... `);
  await client.query(sql);
  console.log("OK");
}

try {
  if (!(await hasCoreSchema())) {
    if (!existsSync(baselineFile)) {
      throw new Error(
        `Core database schema is missing and baseline was not found: ${baselineFile}`
      );
    }

    // Supabase exports keep extensions in a dedicated schema. Create and seed it
    // before running the historical baseline so extension-qualified functions exist.
    await client.query("CREATE SCHEMA IF NOT EXISTS extensions");
    await client.query(
      "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions"
    );

    // The baseline assumes both auth compatibility helpers/roles and public.users
    // already exist. They are safe to run again in the normal numbered pass below.
    await runSqlFile(
      "000_auth_compat.sql",
      "Preparing auth compatibility"
    );
    await runSqlFile(
      "001_create_users.sql",
      "Preparing users table"
    );

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
