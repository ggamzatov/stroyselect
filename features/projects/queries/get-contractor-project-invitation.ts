import "server-only";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export type ContractorProjectInvitation = {
  id: string;
  projectId: string;
  contractorId: string;
  status: "invited" | "viewed" | "accepted" | "declined" | "cancelled";
  responseNote: string | null;
  shortlistedAt: string | null;
  createdAt: string;
};

export async function getContractorProjectInvitation(
  projectId: string
): Promise<ContractorProjectInvitation | null> {
  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "contractor") return null;

  const result = await db.query<{
    id: string;
    project_id: string;
    contractor_id: string;
    status: ContractorProjectInvitation["status"];
    response_note: string | null;
    shortlisted_at: Date | string | null;
    created_at: Date | string;
  }>(
    `
      SELECT i.id, i.project_id, i.contractor_id, i.status,
             i.response_note, i.shortlisted_at, i.created_at
      FROM public.project_contractor_invitations i
      JOIN public.contractor_companies cc ON cc.id=i.contractor_id
      WHERE i.project_id=$1::uuid
        AND cc.owner_id=$2::uuid
      LIMIT 1
    `,
    [projectId, auth.user.id]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    contractorId: row.contractor_id,
    status: row.status,
    responseNote: row.response_note,
    shortlistedAt: row.shortlisted_at ? toIso(row.shortlisted_at) : null,
    createdAt: toIso(row.created_at),
  };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
