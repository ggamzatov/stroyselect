import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationsDir = path.resolve("infrastructure/postgres");
const files = (await readdir(migrationsDir))
  .filter((name) => /^\d{3}_.+\.sql$/.test(name))
  .sort((a, b) => a.localeCompare(b));

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
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
