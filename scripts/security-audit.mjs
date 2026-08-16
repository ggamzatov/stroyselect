import fs from "node:fs";
import path from "node:path";

const roots = ["app", "features", "lib"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const allowDirectSignedUrl = new Set(["lib/storage/get-signed-file-url.ts"]);

const findings = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  walk(root);
}

if (findings.length) {
  console.error("Security audit failed:\n");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Security audit passed");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "coverage"].includes(entry.name)) continue;
      walk(full);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;
    inspect(full.replaceAll(path.sep, "/"));
  }
}

function inspect(file) {
  const source = fs.readFileSync(file, "utf8");
  const isClient = /^\s*["']use client["'];/m.test(source);

  if (/\beval\s*\(/.test(source) || /new\s+Function\s*\(/.test(source)) {
    findings.push(`${file}: dynamic code execution is not allowed`);
  }

  if (/dangerouslySetInnerHTML\s*=/.test(source)) {
    findings.push(`${file}: dangerouslySetInnerHTML requires explicit security review`);
  }

  if (/\bACL\s*:\s*["']public-read["']/.test(source)) {
    findings.push(`${file}: public-read S3 ACL is not allowed`);
  }

  if (/from\s+["']@aws-sdk\/s3-request-presigner["']/.test(source) && !allowDirectSignedUrl.has(file)) {
    findings.push(`${file}: use lib/storage/get-signed-file-url.ts instead of direct presigning`);
  }

  if (isClient && /from\s+["']@\/lib\/(?:db|storage\/s3|auth\/session)/.test(source)) {
    findings.push(`${file}: client component imports a server-only security/data module`);
  }

  if (/redirect\s*\(\s*(?:String\s*\()?formData\.get\(/.test(source)) {
    findings.push(`${file}: possible open redirect from form data`);
  }

  if (/from\s+["']node:child_process["']/.test(source) || /require\(["']child_process["']\)/.test(source)) {
    findings.push(`${file}: child_process usage requires explicit security review`);
  }
}
