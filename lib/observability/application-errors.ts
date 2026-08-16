import "server-only";

import crypto from "node:crypto";

import { db } from "@/lib/db/pool";

type ApplicationErrorInput = {
  userId?: string | null;
  source?: "server" | "client" | "api" | "action" | "unknown";
  severity?: "warning" | "error" | "fatal";
  message: string;
  stack?: string | null;
  route?: string | null;
  method?: string | null;
  digest?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logApplicationError(input: ApplicationErrorInput) {
  const message = input.message.trim().slice(0, 10_000);
  if (!message) return;

  try {
    await db.query(
      `
        INSERT INTO public.application_errors (
          user_id,
          source,
          severity,
          message,
          stack,
          route,
          method,
          digest,
          user_agent,
          metadata
        ) VALUES (
          $1::uuid,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb
        )
      `,
      [
        input.userId ?? null,
        input.source ?? "unknown",
        input.severity ?? "error",
        message,
        input.stack?.slice(0, 30_000) ?? null,
        input.route?.slice(0, 2_000) ?? null,
        input.method?.slice(0, 16) ?? null,
        input.digest?.slice(0, 160) ?? null,
        input.userAgent?.slice(0, 2_000) ?? null,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
  } catch (loggingError) {
    console.error("Не удалось записать ошибку приложения в журнал:", loggingError);
  }
}

export async function resolveErrorUserIdFromCookieHeader(
  cookieHeader: string | string[] | undefined
): Promise<string | null> {
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader;
  if (!raw) return null;

  const cookieNames = ["__Host-stroyselect_session", "stroyselect_session"];
  let token: string | null = null;

  for (const part of raw.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!cookieNames.includes(rawName)) continue;
    token = decodeURIComponent(rawValue.join("="));
    break;
  }

  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const result = await db.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM public.auth_sessions
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > now()
        LIMIT 1
      `,
      [tokenHash]
    );
    return result.rows[0]?.user_id ?? null;
  } catch {
    return null;
  }
}
