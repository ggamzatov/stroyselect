import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const migrationsDir = path.join(process.cwd(), "infrastructure", "postgres");
const entries = await readdir(migrationsDir, { withFileTypes: true });
const migrations = entries
  .filter((entry) => entry.isFile() && /^\d{3}_.+\.sql$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (migrations.length === 0) {
  console.error("No PostgreSQL migrations found.");
  process.exit(1);
}

const seen = new Set();
for (const migration of migrations) {
  const prefix = Number(migration.slice(0, 3));
  if (seen.has(prefix)) {
    console.error(`Duplicate migration prefix: ${String(prefix).padStart(3, "0")}`);
    process.exit(1);
  }
  seen.add(prefix);
}

const first = Number(migrations[0].slice(0, 3));
const last = Number(migrations.at(-1).slice(0, 3));
for (let index = first; index <= last; index += 1) {
  if (!seen.has(index)) {
    console.error(`Missing migration prefix: ${String(index).padStart(3, "0")}`);
    process.exit(1);
  }
}

console.log(`Migration sequence OK: ${migrations[0]} -> ${migrations.at(-1)} (${migrations.length} files)`);
