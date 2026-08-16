import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const roots = ["app", "features", "lib"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const forbidden = [
  /@supabase\//,
  /lib\/supabase/,
  /createAdminClient\s*\(/,
  /auth\.getUser\s*\(/,
  /auth\.getSession\s*\(/,
  /\.storage\.(from|upload|download|remove)\s*\(/,
];

const violations = [];

for (const root of roots) {
  await walk(path.join(process.cwd(), root));
}

if (violations.length > 0) {
  console.error("Legacy Supabase usage detected:");
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log("Legacy dependency audit OK: no Supabase runtime usage in app/features/lib.");

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !extensions.has(path.extname(entry.name))) continue;

    const content = await readFile(fullPath, "utf8");
    if (forbidden.some((pattern) => pattern.test(content))) {
      violations.push(path.relative(process.cwd(), fullPath));
    }
  }
}
