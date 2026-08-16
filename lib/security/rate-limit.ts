import "server-only";

import crypto from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

import { db } from "@/lib/db/pool";

type RateLimitInput = {
  scope: string;
  identity: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
};

type RateLimitRow = {
  request_count: number;
  blocked_until: Date | string | null;
  window_started_at: Date | string;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export async function enforceRateLimit({
  scope,
  identity,
  limit,
  windowSeconds,
  blockSeconds = windowSeconds,
}: RateLimitInput): Promise<RateLimitResult> {
  const safeLimit = Math.max(1, Math.trunc(limit));
  const safeWindowSeconds = Math.max(1, Math.trunc(windowSeconds));
  const safeBlockSeconds = Math.max(1, Math.trunc(blockSeconds));
  const keyHash = hashIdentity(identity);

  const result = await db.query<RateLimitRow>(
    `
      INSERT INTO public.action_rate_limits (
        scope,
        key_hash,
        window_started_at,
        request_count,
        blocked_until,
        updated_at
      )
      VALUES ($1::varchar(100), $2::char(64), now(), 1, NULL, now())
      ON CONFLICT (scope, key_hash)
      DO UPDATE SET
        request_count = CASE
          WHEN action_rate_limits.blocked_until IS NOT NULL
            AND action_rate_limits.blocked_until > now()
            THEN action_rate_limits.request_count
          WHEN action_rate_limits.window_started_at <=
            now() - ($3::text || ' seconds')::interval
            THEN 1
          ELSE action_rate_limits.request_count + 1
        END,
        window_started_at = CASE
          WHEN action_rate_limits.blocked_until IS NOT NULL
            AND action_rate_limits.blocked_until > now()
            THEN action_rate_limits.window_started_at
          WHEN action_rate_limits.window_started_at <=
            now() - ($3::text || ' seconds')::interval
            THEN now()
          ELSE action_rate_limits.window_started_at
        END,
        blocked_until = CASE
          WHEN action_rate_limits.blocked_until IS NOT NULL
            AND action_rate_limits.blocked_until > now()
            THEN action_rate_limits.blocked_until
          WHEN action_rate_limits.window_started_at <=
            now() - ($3::text || ' seconds')::interval
            THEN NULL
          WHEN action_rate_limits.request_count + 1 > $4::integer
            THEN now() + ($5::text || ' seconds')::interval
          ELSE NULL
        END,
        updated_at = now()
      RETURNING request_count, blocked_until, window_started_at
    `,
    [scope, keyHash, safeWindowSeconds, safeLimit, safeBlockSeconds]
  );

  const row = result.rows[0];
  if (!row) return { allowed: true, retryAfterSeconds: 0 };

  if (row.blocked_until) {
    const blockedUntil = toDate(row.blocked_until);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((blockedUntil.getTime() - Date.now()) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }

  if (Number(row.request_count) > safeLimit) {
    const startedAt = toDate(row.window_started_at);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (startedAt.getTime() + safeWindowSeconds * 1000 - Date.now()) / 1000
      )
    );
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function getRequestIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const realIp = store.get("x-real-ip");
  const candidate = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return normalizeIp(candidate);
}

export function rateLimitMessage(result: RateLimitResult) {
  const seconds = Math.max(1, result.retryAfterSeconds);
  return `Слишком много запросов. Повторите через ${seconds} сек.`;
}

function hashIdentity(identity: string) {
  return crypto.createHash("sha256").update(identity).digest("hex");
}

function normalizeIp(value: string) {
  const trimmed = value.trim();
  if (isIP(trimmed)) return trimmed;

  const ipv6Bracket = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/)?.[1];
  if (ipv6Bracket && isIP(ipv6Bracket)) return ipv6Bracket;

  const ipv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)?.[1];
  if (ipv4WithPort && isIP(ipv4WithPort)) return ipv4WithPort;

  return "unknown";
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}
