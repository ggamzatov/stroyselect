import "server-only";

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
