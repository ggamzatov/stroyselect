import "server-only";

import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __stroyselectPgPool:
    | Pool
    | undefined;
}

function createPool() {
  const connectionString =
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL не указан"
    );
  }

  return new Pool({
    connectionString,

    max: 10,

    idleTimeoutMillis:
      30_000,

    connectionTimeoutMillis:
      5_000,

    allowExitOnIdle:
      true,
  });
}

export const db =
  globalThis
    .__stroyselectPgPool ??
  createPool();

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalThis.__stroyselectPgPool =
    db;
}