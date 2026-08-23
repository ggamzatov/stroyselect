import { readFile, stat } from "node:fs/promises";

const requiredFiles = [
  ".env.example",
  "docs/production-runbook.md",
  "scripts/db-backup.sh",
  "scripts/db-restore.sh",
  "scripts/db-restore-drill.sh",
  "scripts/production-launch-check.mjs",
  "app/api/health/live/route.ts",
  "app/api/health/ready/route.ts",
  "app/api/internal/maintenance/route.ts",
  "vercel.json",
  ".github/workflows/ci.yml",
];

const failures = [];
const warnings = [];

async function text(path) { return readFile(path, "utf8"); }

for (const file of requiredFiles) {
  try { const info = await stat(file); if (!info.isFile()) failures.push(`${file}: expected a file`); }
  catch { failures.push(`${file}: missing production-readiness artifact`); }
}

const gitignore = await text(".gitignore");
if (!gitignore.includes(".env*")) failures.push(".gitignore must exclude environment files");
if (!gitignore.includes("*.dump")) failures.push(".gitignore must exclude database dumps");

const session = await text("lib/auth/session.ts");
if (!session.includes("__Host-stroyselect_session")) failures.push("production session must use a __Host- cookie");
if (!session.includes("httpOnly: true")) failures.push("session cookie must be HttpOnly");
if (!session.includes("sameSite: \"lax\"")) failures.push("session cookie must define SameSite policy");
if (!session.includes('secure: process.env.NODE_ENV === "production" && !INSECURE_E2E_SESSION')) failures.push("session cookie must be Secure in production except explicit loopback E2E");
if (!session.includes('process.env.E2E_ALLOW_INSECURE_SESSION === "1"') || !session.includes("127\\.0\\.0\\.1|localhost")) failures.push("insecure E2E session override must be explicit and loopback-only");

const nextConfig = await text("next.config.ts");
for (const header of ["X-Content-Type-Options","X-Frame-Options","Referrer-Policy","Permissions-Policy","Strict-Transport-Security"]) {
  if (!nextConfig.includes(header)) failures.push(`next.config.ts missing ${header}`);
}
if (!nextConfig.includes("poweredByHeader: false")) failures.push("Next.js powered-by header must be disabled");

const ready = await text("app/api/health/ready/route.ts");
const verifiesPostgres = ready.includes("db.query") && (ready.includes("SELECT 1") || ready.includes("to_regclass('public.projects')"));
if (!verifiesPostgres) failures.push("readiness endpoint must verify PostgreSQL");
if (!ready.includes("status: 503")) failures.push("readiness endpoint must fail closed when DB is unavailable");
if (!ready.includes('"Cache-Control": "no-store"')) failures.push("readiness endpoint must not be cached");

const email = await text("lib/email/send-transactional-email.ts");
for (const envName of ["RESEND_API_KEY", "EMAIL_FROM", "APP_BASE_URL"]) if (!email.includes(envName)) failures.push(`transactional email flow missing ${envName}`);

const maintenance=await text("app/api/internal/maintenance/route.ts");
if(!maintenance.includes("CRON_SECRET"))failures.push("scheduled maintenance endpoint must require CRON_SECRET");
if(!maintenance.includes("notification_delivery_queue"))failures.push("scheduled maintenance must process email delivery queue");
const vercel=await text("vercel.json");
if(!vercel.includes("/api/internal/maintenance"))failures.push("Vercel cron must invoke scheduled maintenance endpoint");

const s3 = await text("lib/storage/s3.ts");
for (const envName of ["S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY"]) if (!s3.includes(envName)) failures.push(`S3 configuration missing ${envName}`);

const ci = await text(".github/workflows/ci.yml");
for (const gate of ["migrations:apply", "security:audit", "authorization:audit", "production:audit", "test:e2e:production:seeded"]) if (!ci.includes(gate)) failures.push(`CI missing production gate: ${gate}`);

const packageJson = JSON.parse(await text("package.json"));
for (const script of ["verify", "db:backup", "db:restore-drill", "test:e2e:production:seeded", "production:launch:check"]) if (!packageJson.scripts?.[script]) failures.push(`package.json missing script: ${script}`);
const productionE2e=String(packageJson.scripts?.["test:e2e:production:seeded"]??"");
if(!productionE2e.includes("ui-regression.spec.ts"))failures.push("production E2E gate must include UI regression");
if(!productionE2e.includes("pre-launch-quality.spec.ts"))failures.push("production E2E gate must include pre-launch quality regression");

const launchCheck=await text("scripts/production-launch-check.mjs");
for(const requirement of ["release_checklist","marketplace_operational_alerts","/api/health/ready","/robots.txt","/sitemap.xml","/api/internal/maintenance"]){
  if(!launchCheck.includes(requirement))failures.push(`production launch check missing: ${requirement}`);
}

const envExample = await text(".env.example");
for (const name of [
  "DATABASE_URL","APP_BASE_URL","NEXT_PUBLIC_APP_URL","CRON_SECRET","S3_ENDPOINT","S3_ACCESS_KEY","S3_SECRET_KEY","RESEND_API_KEY","EMAIL_FROM",
  "PAYMENTS_ENABLED","YOOKASSA_SHOP_ID","YOOKASSA_SECRET_KEY","YOOKASSA_PLATFORM_FEE_PERCENT",
  "LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_INN","LEGAL_OPERATOR_OGRN","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_EMAIL","LEGAL_OPERATOR_PHONE"
]) if (!envExample.includes(`${name}=`)) failures.push(`.env.example missing ${name}`);

if (process.argv.includes("--env")) {
  const requiredEnv = ["DATABASE_URL","APP_BASE_URL","NEXT_PUBLIC_APP_URL","CRON_SECRET","S3_ENDPOINT","S3_ACCESS_KEY","S3_SECRET_KEY","RESEND_API_KEY","EMAIL_FROM"];
  for (const name of requiredEnv) if (!process.env[name]?.trim()) failures.push(`production environment missing ${name}`);

  if(process.env.E2E_ALLOW_INSECURE_SESSION === "1") failures.push("E2E_ALLOW_INSECURE_SESSION must never be enabled in deployed production");

  const legalEnv=["LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_INN","LEGAL_OPERATOR_OGRN","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_EMAIL"];
  for(const name of legalEnv)if(!process.env[name]?.trim())failures.push(`public launch legal configuration missing ${name}`);

  const paymentsEnabled=String(process.env.PAYMENTS_ENABLED??"false").toLowerCase()==="true";
  if(paymentsEnabled){
    for(const name of ["YOOKASSA_SHOP_ID","YOOKASSA_SECRET_KEY"])if(!process.env[name]?.trim())failures.push(`payments are enabled but ${name} is missing`);
    const fee=Number(process.env.YOOKASSA_PLATFORM_FEE_PERCENT??"0");if(!Number.isFinite(fee)||fee<0||fee>=100)failures.push("YOOKASSA_PLATFORM_FEE_PERCENT must be between 0 and 100");
  }

  const baseUrl=process.env.APP_BASE_URL?.trim();
  const publicUrl=process.env.NEXT_PUBLIC_APP_URL?.trim();
  if(baseUrl&&!baseUrl.startsWith("https://"))failures.push("APP_BASE_URL must use HTTPS in production");
  if(publicUrl&&!publicUrl.startsWith("https://"))failures.push("NEXT_PUBLIC_APP_URL must use HTTPS in production");
  if(baseUrl&&publicUrl&&baseUrl.replace(/\/$/,"")!==publicUrl.replace(/\/$/,""))failures.push("APP_BASE_URL and NEXT_PUBLIC_APP_URL must use the same canonical origin");

  const cronSecret=process.env.CRON_SECRET?.trim()??"";
  if(cronSecret&&cronSecret.length<32)failures.push("CRON_SECRET must be at least 32 characters");

  const s3Endpoint=process.env.S3_ENDPOINT?.trim();
  if(s3Endpoint&&!/^https:\/\//i.test(s3Endpoint)&&!/localhost|127\.0\.0\.1/.test(s3Endpoint))failures.push("S3_ENDPOINT must use HTTPS in deployed production");

  const resend=process.env.RESEND_API_KEY?.trim();
  if(resend&&!resend.startsWith("re_"))warnings.push("RESEND_API_KEY does not look like a Resend API key");
  const emailFrom=process.env.EMAIL_FROM?.trim();
  if(emailFrom&&!/@/.test(emailFrom))failures.push("EMAIL_FROM must contain a valid sender email address");

  const inn=(process.env.LEGAL_OPERATOR_INN??"").replace(/\D/g,"");
  if(inn&&![10,12].includes(inn.length))failures.push("LEGAL_OPERATOR_INN must contain 10 or 12 digits");
  const ogrn=(process.env.LEGAL_OPERATOR_OGRN??"").replace(/\D/g,"");
  if(ogrn&&![13,15].includes(ogrn.length))failures.push("LEGAL_OPERATOR_OGRN must contain 13 or 15 digits");
  const legalEmail=process.env.LEGAL_OPERATOR_EMAIL?.trim();
  if(legalEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalEmail))failures.push("LEGAL_OPERATOR_EMAIL has invalid format");

  const databaseUrl=process.env.DATABASE_URL?.trim();
  if(databaseUrl&&/localhost|127\.0\.0\.1/.test(databaseUrl))warnings.push("DATABASE_URL points to localhost; acceptable for local release drills, not for deployed production");

  for (const [name, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (["CRON_SECRET","S3_ACCESS_KEY","S3_SECRET_KEY","RESEND_API_KEY","YOOKASSA_SECRET_KEY"].includes(name) && /change-me|example|dummy/i.test(value)) failures.push(`${name} still looks like a placeholder credential`);
    if (["LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_EMAIL"].includes(name) && /change-me|example|пример/i.test(value)) failures.push(`${name} still looks like placeholder legal data`);
  }
}

for (const warning of warnings) console.warn(`Production readiness warning: ${warning}`);
if (failures.length) { console.error("Production readiness audit failed:\n"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log(`Production readiness audit passed${process.argv.includes("--env") ? " (including environment)" : ""}`);
