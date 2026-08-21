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
  const stableMessage = message
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<uuid>")
    .replace(/\b\d{4,}\b/g, "<n>");

  return crypto
    .createHash("sha256")
    .update(
      [
        input.source ?? "unknown",
        input.route ?? "",
        input.method ?? "",
        input.digest ?? "",
        stableMessage,
      ].join("|")
    )
    .digest("hex");
}

export async function logApplicationError(input: ApplicationErrorInput) {
  const message = input.message.trim().slice(0, 10_000);
  if (!message) return;

  const source = input.source ?? "unknown";
  const severity = input.severity ?? "error";
  const stack = input.stack?.slice(0, 30_000) ?? null;
  const route = input.route?.slice(0, 2_000) ?? null;
  const method = input.method?.slice(0, 16) ?? null;
  const digest = input.digest?.slice(0, 160) ?? null;
  const userAgent = input.userAgent?.slice(0, 2_000) ?? null;
  const metadata = JSON.stringify(input.metadata ?? {});
  const fingerprint = errorFingerprint(input, message);

  try {
    // UPDATE использует отдельный компактный набор параметров.
    // Ранее сюда передавался массив для INSERT с пропущенными placeholders
    // ($2, $4, $6, $7), из-за чего PostgreSQL не мог вывести их тип и
    // завершал запрос с 42P18: could not determine data type of parameter.
    const updated = await db.query(
      `
        UPDATE public.application_errors
        SET
          occurrence_count = occurrence_count + 1,
          last_seen_at = now(),
          user_id = COALESCE($1::uuid, user_id),
          severity = $2::text,
          stack = COALESCE($3::text, stack),
          digest = COALESCE($4::text, digest),
          user_agent = COALESCE($5::text, user_agent),
          metadata = metadata || $6::jsonb
        WHERE id = (
          SELECT id
          FROM public.application_errors
          WHERE fingerprint = $7::text
            AND resolved_at IS NULL
          ORDER BY last_seen_at DESC
          LIMIT 1
        )
        RETURNING id
      `,
      [
        input.userId ?? null,
        severity,
        stack,
        digest,
        userAgent,
        metadata,
        fingerprint,
      ]
    );

    if (updated.rowCount) return;

    await db.query(
      `
        INSERT INTO public.application_errors (
          user_id, source, severity, message, stack, route, method,
          digest, user_agent, metadata, fingerprint,
          occurrence_count, first_seen_at, last_seen_at
        ) VALUES (
          $1::uuid,
          $2::text,
          $3::text,
          $4::text,
          $5::text,
          $6::text,
          $7::text,
          $8::text,
          $9::text,
          $10::jsonb,
          $11::text,
          1,
          now(),
          now()
        )
      `,
      [
        input.userId ?? null,
        source,
        severity,
        message,
        stack,
        route,
        method,
        digest,
        userAgent,
        metadata,
        fingerprint,
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
        WHERE token_hash = $1::text
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
