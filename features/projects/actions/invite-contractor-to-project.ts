"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createNotification } from "@/features/notifications/server/create-notification";

export async function inviteContractorToProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const contractorId = String(formData.get("contractorId") ?? "").trim();

  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "customer") return;

  const result = await db.query<{
    project_title: string;
    contractor_owner_id: string;
  }>(
    `
      WITH eligible AS (
        SELECT
          p.id AS project_id,
          p.title AS project_title,
          cc.id AS contractor_id,
          cc.owner_id AS contractor_owner_id
        FROM public.projects p
        JOIN public.contractor_companies cc
          ON cc.id = $2::uuid
        WHERE p.id = $1::uuid
          AND p.customer_id = $3::uuid
          AND p.status IN ('published','collecting_bids')
          AND cc.verification_status = 'verified'
          AND cc.accepts_new_projects = true
      ), inserted AS (
        INSERT INTO public.project_contractor_invitations (
          project_id,
          contractor_id,
          invited_by
        )
        SELECT project_id, contractor_id, $3::uuid
        FROM eligible
        ON CONFLICT (project_id, contractor_id) DO NOTHING
        RETURNING project_id, contractor_id
      )
      SELECT e.project_title, e.contractor_owner_id
      FROM eligible e
      JOIN inserted i
        ON i.project_id = e.project_id
       AND i.contractor_id = e.contractor_id
      LIMIT 1
    `,
    [projectId, contractorId, auth.user.id]
  );

  const row = result.rows[0];
  if (!row) {
    revalidatePath(`/customer/projects/${projectId}/matches`);
    return;
  }

  await createNotification({
    userId: row.contractor_owner_id,
    actorId: auth.user.id,
    notificationType: "project_invitation",
    title: "Заказчик приглашает вас в проект",
    body: row.project_title,
    projectId,
    url: `/contractor/projects/${projectId}`,
    deduplicationKey: `project-invitation:${projectId}:${contractorId}`,
    metadata: {
      project_id: projectId,
      contractor_id: contractorId,
    },
  });

  revalidatePath(`/customer/projects/${projectId}/matches`);
  revalidatePath(`/contractor/projects`);
}
