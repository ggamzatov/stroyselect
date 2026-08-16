import "server-only";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

export async function getAdminAudit(limit = 300) {
  await requireStaffUser();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const result = await db.query<{
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    reason: string | null;
    metadata: Record<string, unknown>;
    created_at: Date | string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }>(
    `
      SELECT a.id,a.actor_id,a.action,a.entity_type,a.entity_id,a.reason,a.metadata,a.created_at,
             p.first_name,p.last_name,u.email
      FROM public.admin_audit_log a
      LEFT JOIN public.profiles p ON p.id=a.actor_id
      LEFT JOIN public.users u ON u.id=a.actor_id
      ORDER BY a.created_at DESC
      LIMIT $1
    `,
    [safeLimit]
  );
  return result.rows.map((row) => ({
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    actor_name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "Система",
  }));
}
