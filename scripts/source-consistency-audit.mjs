import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["app", "features", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx"]);
const failures = [];

const forbiddenUiPhrases = [
  "Trust Center",
  "Trust profile",
  "Audit Trail",
  "Audit trail",
  "Change orders",
  "Milestones & Budget Control",
  "Something went wrong",
  "Loading...",
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function report(file, text, index, message) {
  failures.push(`${file}:${lineOf(text, index)}: ${message}`);
}

function auditTypeScriptEscapes(file, text) {
  for (const token of ["@ts-ignore", "@ts-nocheck"]) {
    let start = 0;
    while ((start = text.indexOf(token, start)) !== -1) {
      report(file, text, start, `${token} is forbidden; fix the type instead`);
      start += token.length;
    }
  }
}

function auditUiLanguage(file, text) {
  if (!file.endsWith(".tsx")) return;
  for (const phrase of forbiddenUiPhrases) {
    let start = 0;
    while ((start = text.indexOf(phrase, start)) !== -1) {
      report(file, text, start, `legacy English UI phrase remains: ${phrase}`);
      start += phrase.length;
    }
  }
}

function auditSqlParameterTyping(file, text) {
  // Catch the PostgreSQL 42P08 class already seen in production. We only treat
  // placeholders in an UPDATE SET clause as assignments; ordinary predicates
  // such as column::text=$9 must not be reported as writes.
  const sqlBlocks = text.matchAll(/`([\s\S]*?(?:SELECT|INSERT|UPDATE|DELETE)[\s\S]*?)`/gi);
  for (const match of sqlBlocks) {
    const sql = match[1];
    const blockOffset = (match.index ?? 0) + 1;
    const updateSetMatch = /\bUPDATE\b[\s\S]*?\bSET\b([\s\S]*?)(?:\bWHERE\b|\bRETURNING\b|$)/i.exec(sql);
    if (!updateSetMatch) continue;
    const setClause = updateSetMatch[1];
    const numbers = new Set([...sql.matchAll(/\$(\d+)/g)].map((m) => m[1]));
    for (const number of numbers) {
      const token = `\\$${number}(?!\\d)`;
      const uncastAssignment = new RegExp(`(?:^|,)\\s*[a-zA-Z_][a-zA-Z0-9_]*\\s*=\\s*${token}(?!\\s*::)`, "i");
      const stringComparison = new RegExp(`${token}(?!\\s*::)\\s*(?:=|<>|!=)\\s*'`, "i");
      const caseComparison = new RegExp(`CASE\\s+WHEN\\s+${token}(?!\\s*::)`, "i");
      if (uncastAssignment.test(setClause) && (stringComparison.test(sql) || caseComparison.test(sql))) {
        const localIndex = sql.search(new RegExp(token));
        report(file, text, blockOffset + Math.max(0, localIndex), `PostgreSQL parameter $${number} is used in mixed typed contexts without an explicit cast`);
      }
    }
  }
}

const files = (await Promise.all(ROOTS.map((root) => walk(root)))).flat();
for (const file of files) {
  const text = await readFile(file, "utf8");
  auditTypeScriptEscapes(file, text);
  auditUiLanguage(file, text);
  auditSqlParameterTyping(file, text);
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const e2eBuild = String(packageJson.scripts?.["e2e:build"] ?? "");
if (!e2eBuild.includes("prepare-e2e-standalone.mjs")) failures.push("package.json: e2e:build must prepare standalone static/public assets");

const dockerfile = await readFile("Dockerfile", "utf8");
for (const required of ["/app/public ./public", "/app/.next/standalone ./", "/app/.next/static ./.next/static"]) {
  if (!dockerfile.includes(required)) failures.push(`Dockerfile: standalone runtime packaging missing ${required}`);
}

if (failures.length) {
  console.error("Source consistency audit failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Source consistency audit passed: ${files.length} TypeScript files checked`);
