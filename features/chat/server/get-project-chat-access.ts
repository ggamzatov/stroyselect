import "server-only";

import { db } from "@/lib/db/pool";

type ChatAccessRow = {
  id: string;
  customer_id: string;
  selected_contractor_id: string | null;
  contractor_owner_id: string | null;
  status: string;
  is_admin_blocked: boolean;
};

export async function getProjectChatAccess(
  projectId: string,
  userId: string
) {
  const result = await db.query<ChatAccessRow>(
    `
      SELECT
        p.id,
        p.customer_id,
        p.selected_contractor_id,
        cc.owner_id AS contractor_owner_id,
        p.status,
        p.is_admin_blocked
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc
        ON cc.id = p.selected_contractor_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [projectId]
  );

  const project = result.rows[0];
  if (!project || project.is_admin_blocked) return null;

  const profileResult = await db.query<{ role: string; is_blocked: boolean }>(
    `SELECT role::text AS role, is_blocked FROM public.profiles WHERE id = $1 LIMIT 1`,
    [userId]
  );

  const profile = profileResult.rows[0];
  if (!profile || profile.is_blocked) return null;

  const isParticipant =
    project.customer_id === userId ||
    project.contractor_owner_id === userId;

  const isStaff = ["admin", "moderator", "manager"].includes(profile.role);

  if (!isParticipant && !isStaff) return null;

  return {
    project,
    role: profile.role,
    isCustomer: project.customer_id === userId,
    isContractor: project.contractor_owner_id === userId,
    isStaff,
  };
}
