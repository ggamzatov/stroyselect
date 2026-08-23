import { readFile, stat } from "node:fs/promises";

const requiredFiles = [
  ".env.example",
  "docs/production-runbook.md",
  "scripts/db-backup.sh",
  "scripts/db-restore.sh",
  "scripts/db-restore-drill.sh",
  "app/api/health/live/route.ts",
  "app/api/health/ready/route.ts",
  ".github/workflows/ci.yml",
];

const failures = [];
const warnings = [];

async function text(path) {
  return readFile(path, "utf8");
}

for (const file of requiredFiles) {
  try {
    const info = await stat(file);
    if (!info.isFile()) failures.push(`${file}: expected a file`);
  } catch {
    failures.push(`${file}: missing production-readiness artifact`);
  }
}

const gitignore = await text(".gitignore");
if (!gitignore.includes(".env*")) failures.push(".gitignore must exclude environment files");
if (!gitignore.includes("*.dump")) failures.push(".gitignore must exclude database dumps");

const session = await text("lib/auth/session.ts");
if (!session.includes("__Host-stroyselect_session")) failures.push("production session must use a __Host- cookie");
if (!session.includes("httpOnly: true")) failures.push("session cookie must be HttpOnly");
if (!session.includes("sameSite: \"lax\"")) failures.push("session cookie must define SameSite policy");
if (!session.includes("secure: process.env.NODE_ENV === \"production\"")) failures.push("session cookie must be Secure in production");

const nextConfig = await text("next.config.ts");
for (const header of [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
]) {
  if (!nextConfig.includes(header)) failures.push(`next.config.ts missing ${header}`);
}
if (!nextConfig.includes("poweredByHeader: false")) failures.push("Next.js powered-by header must be disabled");

const ready = await text("app/api/health/ready/route.ts");
const verifiesPostgres =
  ready.includes("db.query") &&
  (ready.includes("SELECT 1") || ready.includes("to_regclass('public.projects')"));
if (!verifiesPostgres) failures.push("readiness endpoint must verify PostgreSQL");
if (!ready.includes("status: 503")) failures.push("readiness endpoint must fail closed when DB is unavailable");
if (!ready.includes('"Cache-Control": "no-store"')) failures.push("readiness endpoint must not be cached");

const email = await text("lib/email/send-transactional-email.ts");
for (const envName of ["RESEND_API_KEY", "EMAIL_FROM", "APP_BASE_URL"]) {
  if (!email.includes(envName)) failures.push(`transactional email flow missing ${envName}`);
}

const s3 = await text("lib/storage/s3.ts");
for (const envName of ["S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY"]) {
  if (!s3.includes(envName)) failures.push(`S3 configuration missing ${envName}`);
}

const ci = await text(".github/workflows/ci.yml");
for (const gate of ["migrations:apply", "security:audit", "authorization:audit", "test:e2e:production:seeded"]) {
  if (!ci.includes(gate)) failures.push(`CI missing production gate: ${gate}`);
}

const packageJson = JSON.parse(await text("package.json"));
for (const script of ["verify", "db:backup", "db:restore-drill", "test:e2e:production:seeded"]) {
  if (!packageJson.scripts?.[script]) failures.push(`package.json missing script: ${script}`);
}

const envExample = await text(".env.example");
for (const name of [
  "DATABASE_URL",
  "APP_BASE_URL",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
]) {
  if (!envExample.includes(`${name}=`)) failures.push(`.env.example missing ${name}`);
}

if (process.argv.includes("--env")) {
  const requiredEnv = [
    "DATABASE_URL",
    "APP_BASE_URL",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "RESEND_API_KEY",
    "EMAIL_FROM",
  ];
  for (const name of requiredEnv) {
    if (!process.env[name]?.trim()) failures.push(`production environment missing ${name}`);
  }

  const baseUrl = process.env.APP_BASE_URL?.trim();
  if (baseUrl && !baseUrl.startsWith("https://")) failures.push("APP_BASE_URL must use HTTPS in production");

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl && /localhost|127\.0\.0\.1/.test(databaseUrl)) {
    warnings.push("DATABASE_URL points to localhost; acceptable for local release drills, not for deployed production");
  }

  for (const [name, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (["S3_ACCESS_KEY", "S3_SECRET_KEY", "RESEND_API_KEY"].includes(name) && /change-me|example|dummy/i.test(value)) {
      failures.push(`${name} still looks like a placeholder credential`);
    }
  }
}

for (const warning of warnings) console.warn(`Production readiness warning: ${warning}`);

if (failures.length) {
  console.error("Production readiness audit failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Production readiness audit passed${process.argv.includes("--env") ? " (including environment)" : ""}`);
