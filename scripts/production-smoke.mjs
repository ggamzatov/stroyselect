const baseUrl = (process.env.DEPLOY_BASE_URL || process.env.APP_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");

if (!baseUrl) {
  console.error("DEPLOY_BASE_URL or APP_BASE_URL is required");
  process.exit(1);
}

if (!/^https:\/\//i.test(baseUrl) && !/localhost|127\.0\.0\.1/.test(baseUrl)) {
  console.error("Production smoke target must use HTTPS (localhost is allowed for drills)");
  process.exit(1);
}

const checks = [];

async function request(path, options = {}) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    cache: "no-store",
    ...options,
  });
  return { response, latencyMs: Date.now() - startedAt };
}

async function check(name, fn) {
  try {
    const detail = await fn();
    checks.push({ name, ok: true, detail });
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ name, ok: false, detail: message });
    console.error(`✗ ${name} — ${message}`);
  }
}

await check("liveness", async () => {
  const { response, latencyMs } = await request("/api/health/live");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.status !== "ok") throw new Error("unexpected health payload");
  return `${latencyMs}ms`;
});

await check("readiness + database", async () => {
  const { response, latencyMs } = await request("/api/health/ready");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.status !== "ok" || payload?.database !== "ok") {
    throw new Error("database readiness is not ok");
  }
  return `${latencyMs}ms`;
});

await check("login page", async () => {
  const { response } = await request("/login");
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  return "200";
});

await check("security headers", async () => {
  const { response } = await request("/login");
  const required = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
  };

  for (const [name, expected] of Object.entries(required)) {
    const actual = response.headers.get(name);
    if (actual !== expected) throw new Error(`${name}=${actual ?? "missing"}`);
  }

  if (/^https:\/\//i.test(baseUrl)) {
    const hsts = response.headers.get("strict-transport-security");
    if (!hsts?.includes("max-age=")) throw new Error("HSTS header missing");
  }

  return "required headers present";
});

await check("admin route is not public", async () => {
  const { response } = await request("/admin/errors");
  if (![302, 303, 307, 308].includes(response.status)) {
    throw new Error(`expected redirect, got HTTP ${response.status}`);
  }
  const location = response.headers.get("location") || "";
  if (!location.includes("/login") && !location.includes("/dashboard")) {
    throw new Error(`unexpected redirect target: ${location || "missing"}`);
  }
  return `redirect ${response.status}`;
});

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nProduction smoke failed: ${failed.length}/${checks.length} checks failed`);
  process.exit(1);
}

console.log(`\nProduction smoke passed: ${checks.length}/${checks.length} checks`);
