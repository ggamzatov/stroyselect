import "server-only";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

type ErrorRow = {
  id: string;
  user_id: string | null;
  source: string;
  severity: string;
  message: string;
  stack: string | null;
  route: string | null;
  method: string | null;
  digest: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  fingerprint: string | null;
  occurrence_count: number;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  resolved_at: Date | string | null;
  created_at: Date | string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

export async function getApplicationErrors(limit = 200) {
  await requireStaffUser();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);

  const result = await db.query<ErrorRow>(
    `
      SELECT
        e.id, e.user_id, e.source, e.severity, e.message, e.stack,
        e.route, e.method, e.digest, e.user_agent, e.metadata,
        e.fingerprint, e.occurrence_count, e.first_seen_at, e.last_seen_at,
        e.resolved_at, e.created_at,
        u.email, p.first_name, p.last_name, p.role
      FROM public.application_errors e
      LEFT JOIN public.users u ON u.id = e.user_id
      LEFT JOIN public.profiles p ON p.id = e.user_id
      ORDER BY (e.resolved_at IS NULL) DESC, e.last_seen_at DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map((row) => ({
    ...row,
    resolved_at: toIsoNullable(row.resolved_at),
    created_at: toIso(row.created_at),
    first_seen_at: toIso(row.first_seen_at),
    last_seen_at: toIso(row.last_seen_at),
  }));
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
function toIsoNullable(value: Date | string | null) {
  return value ? toIso(value) : null;
}
