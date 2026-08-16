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
        e.id,
        e.user_id,
        e.source,
        e.severity,
        e.message,
        e.stack,
        e.route,
        e.method,
        e.digest,
        e.user_agent,
        e.metadata,
        e.resolved_at,
        e.created_at,
        u.email,
        p.first_name,
        p.last_name,
        p.role
      FROM public.application_errors e
      LEFT JOIN public.users u ON u.id = e.user_id
      LEFT JOIN public.profiles p ON p.id = e.user_id
      ORDER BY (e.resolved_at IS NULL) DESC, e.created_at DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map((row) => ({
    ...row,
    resolved_at: row.resolved_at
      ? row.resolved_at instanceof Date
        ? row.resolved_at.toISOString()
        : String(row.resolved_at)
      : null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }));
}
