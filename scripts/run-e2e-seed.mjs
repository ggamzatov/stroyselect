import { existsSync } from "node:fs";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  const envFile = path.resolve(".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required. Set it in the environment or in .env.local");

await import("./seed-e2e.mjs");
await import("./seed-e2e-public-v1.mjs");
await import("./seed-e2e-ops.mjs");
await import("./seed-e2e-materials.mjs");
await import("./reset-e2e-auth.mjs");
