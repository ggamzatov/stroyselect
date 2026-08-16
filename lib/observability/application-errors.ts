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

function errorFingerprint(input: ApplicationErrorInput, message: string) {
  const stableMessage = message.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<uuid>")
    .replace(/\b\d{4,}\b/g, "<n>");
  return crypto
    .createHash("sha256")
    .update([
      input.source ?? "unknown",
      input.route ?? "",
      input.method ?? "",
      input.digest ?? "",
      stableMessage,
    ].join("|"))
    .digest("hex");
}

export async function logApplicationError(input: ApplicationErrorInput) {
  const message = input.message.trim().slice(0, 10_000);
  if (!message) return;

  const fingerprint = errorFingerprint(input, message);
  const values = [
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
    fingerprint,
  ];

  try {
    const updated = await db.query(
      `
        UPDATE public.application_errors
        SET
          occurrence_count = occurrence_count + 1,
          last_seen_at = now(),
          user_id = COALESCE($1::uuid, user_id),
          severity = $3,
          stack = COALESCE($5, stack),
          digest = COALESCE($8, digest),
          user_agent = COALESCE($9, user_agent),
          metadata = metadata || $10::jsonb
        WHERE id = (
          SELECT id
          FROM public.application_errors
          WHERE fingerprint = $11
            AND resolved_at IS NULL
          ORDER BY last_seen_at DESC
          LIMIT 1
        )
        RETURNING id
      `,
      values
    );

    if (updated.rowCount) return;

    await db.query(
      `
        INSERT INTO public.application_errors (
          user_id, source, severity, message, stack, route, method,
          digest, user_agent, metadata, fingerprint,
          occurrence_count, first_seen_at, last_seen_at
        ) VALUES (
          $1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,1,now(),now()
        )
      `,
      values
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
