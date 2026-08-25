import pg from "pg";

const { Pool } = pg;
const baseUrl = (process.env.DEPLOY_BASE_URL || process.env.APP_BASE_URL || "").trim().replace(/\/$/, "");
const databaseUrl = process.env.DATABASE_URL?.trim();

const failures = [];
const warnings = [];

if (!baseUrl) failures.push("DEPLOY_BASE_URL or APP_BASE_URL is required");
if (baseUrl && !/^https:\/\//i.test(baseUrl)) failures.push("Public launch target must use HTTPS");
if (!databaseUrl) failures.push("DATABASE_URL is required");

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }

async function request(path, options = {}) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", cache: "no-store", ...options });
  return { response, latencyMs: Date.now() - startedAt };
}

async function webCheck(name, fn) {
  try {
    const detail = await fn();
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`${name}: ${message}`);
    console.error(`✗ ${name} — ${message}`);
  }
}

if (!failures.length) {
  await webCheck("HTTPS liveness", async () => {
    const { response, latencyMs } = await request("/api/health/live");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.status !== "ok") throw new Error("unexpected health payload");
    return `${latencyMs}ms`;
  });

  await webCheck("Readiness + PostgreSQL", async () => {
    const { response, latencyMs } = await request("/api/health/ready");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.status !== "ok" || payload?.database !== "ok") throw new Error("database readiness is not ok");
    return `${latencyMs}ms`;
  });

  await webCheck("Security headers", async () => {
    const { response } = await request("/login");
    const required = {
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-resource-policy": "same-origin",
    };
    for (const [name, expected] of Object.entries(required)) {
      const actual = response.headers.get(name);
      if (actual !== expected) throw new Error(`${name}=${actual ?? "missing"}`);
    }
    const hsts = response.headers.get("strict-transport-security");
    if (!hsts?.includes("max-age=")) throw new Error("HSTS header missing");
    return "required headers present";
  });

  await webCheck("Public legal pages", async () => {
    for (const path of ["/legal/privacy", "/legal/terms", "/legal/personal-data-consent"]) {
      const { response } = await request(path);
      if (response.status !== 200) throw new Error(`${path} HTTP ${response.status}`);
      const body = await response.text();
      if (/change-me|example\.com|ООО «?СтройВыбор»? \(пример\)/i.test(body)) throw new Error(`${path} contains placeholder operator data`);
    }
    return "3/3";
  });

  await webCheck("Robots + sitemap", async () => {
    const robots = await request("/robots.txt");
    if (robots.response.status !== 200) throw new Error(`robots HTTP ${robots.response.status}`);
    const robotsText = await robots.response.text();
    if (/Disallow:\s*\/$/im.test(robotsText)) throw new Error("robots blocks the whole site");
    const sitemap = await request("/sitemap.xml");
    if (sitemap.response.status !== 200) throw new Error(`sitemap HTTP ${sitemap.response.status}`);
    const sitemapText = await sitemap.response.text();
    if (!sitemapText.includes(baseUrl)) throw new Error("sitemap canonical origin does not match launch target");
    return "public discovery ready";
  });

  await webCheck("Admin routes are private", async () => {
    const { response } = await request("/admin/release");
    if (![302, 303, 307, 308].includes(response.status)) throw new Error(`expected redirect, got HTTP ${response.status}`);
    return `redirect ${response.status}`;
  });

  await webCheck("Maintenance endpoint is protected", async () => {
    const { response } = await request("/api/internal/maintenance");
    if (![401, 403, 405].includes(response.status)) throw new Error(`unauthorized request returned HTTP ${response.status}`);
    return `HTTP ${response.status}`;
  });
}

if (databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 7000 });
  try {
    const incomplete = await pool.query(`
      SELECT key,label,category
      FROM public.release_checklist
      WHERE required=true AND completed_at IS NULL
      ORDER BY category,label
    `);
    if (incomplete.rows.length) {
      for (const item of incomplete.rows) fail(`release checklist incomplete [${item.category}]: ${item.label} (${item.key})`);
    } else {
      console.log("✓ Release checklist — all required rows completed");
    }

    const criticalAlerts = await pool.query(`
      SELECT count(*)::int AS total
      FROM public.marketplace_operational_alerts
      WHERE severity='critical' AND status IN ('open','in_progress')
    `);
    const criticalTotal = Number(criticalAlerts.rows[0]?.total ?? 0);
    if (criticalTotal > 0) fail(`${criticalTotal} critical marketplace SLA alert(s) remain open`);
    else console.log("✓ Marketplace SLA — no open critical alerts");

    const recentErrors = await pool.query(`
      SELECT count(*)::int AS total
      FROM public.application_errors
      WHERE resolved_at IS NULL
        AND last_seen_at >= now()-interval '24 hours'
    `);
    const errorsTotal = Number(recentErrors.rows[0]?.total ?? 0);
    if (errorsTotal > 0) warn(`${errorsTotal} unresolved application error fingerprint(s) seen in the last 24 hours; review /admin/errors`);
    else console.log("✓ Error monitoring — no unresolved errors seen in last 24h");
  } catch (error) {
    fail(`database launch checks failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await pool.end();
  }
}

for (const message of warnings) console.warn(`⚠ ${message}`);
if (failures.length) {
  console.error(`\nPublic launch check failed: ${failures.length} blocker(s)`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(`\nPublic launch check passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}`);
