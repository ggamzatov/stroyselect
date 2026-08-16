"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createNotification } from "@/features/notifications/server/create-notification";

const projectIdSchema = z.string().uuid();
const responseSchema = z.object({
  projectId: z.string().uuid(),
  decision: z.enum(["accepted", "declined"]),
  note: z.string().trim().max(1000).optional(),
});

export async function markProjectInvitationViewed(projectId: string) {
  if (!projectIdSchema.safeParse(projectId).success) return;
  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "contractor") return;

  await db.query(
    `
      UPDATE public.project_contractor_invitations i
      SET status = CASE WHEN i.status='invited' THEN 'viewed' ELSE i.status END,
          viewed_at = COALESCE(i.viewed_at, now()),
          updated_at = now()
      FROM public.contractor_companies cc
      WHERE i.project_id=$1::uuid
        AND i.contractor_id=cc.id
        AND cc.owner_id=$2::uuid
        AND i.status IN ('invited','viewed')
    `,
    [projectId, auth.user.id]
  );

  revalidateProject(projectId);
}

export async function respondToProjectInvitation(input: unknown) {
  const parsed = responseSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Некорректный ответ" };

  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  if (auth.profile.role !== "contractor") {
    return { success: false, message: "Ответить на приглашение может только подрядчик" };
  }

  const { projectId, decision, note } = parsed.data;
  const result = await db.query<{
    project_title: string;
    customer_id: string;
    contractor_id: string;
  }>(
    `
      UPDATE public.project_contractor_invitations i
      SET status=$3,
          responded_at=now(),
          response_note=$4,
          viewed_at=COALESCE(i.viewed_at,now()),
          updated_at=now()
      FROM public.contractor_companies cc, public.projects p
      WHERE i.project_id=$1::uuid
        AND i.project_id=p.id
        AND i.contractor_id=cc.id
        AND cc.owner_id=$2::uuid
        AND i.status IN ('invited','viewed')
      RETURNING p.title AS project_title, p.customer_id, i.contractor_id
    `,
    [projectId, auth.user.id, decision, note || null]
  );

  const row = result.rows[0];
  if (!row) return { success: false, message: "Приглашение уже обработано или не найдено" };

  await createNotification({
    userId: row.customer_id,
    actorId: auth.user.id,
    notificationType: decision === "accepted" ? "project_invitation_accepted" : "project_invitation_declined",
    title: decision === "accepted" ? "Подрядчик принял приглашение" : "Подрядчик отказался от приглашения",
    body: row.project_title,
    projectId,
    url: `/customer/projects/${projectId}/matches`,
    deduplicationKey: `project-invitation-response:${projectId}:${row.contractor_id}:${decision}`,
    metadata: { contractor_id: row.contractor_id, decision, note: note || null },
  });

  revalidateProject(projectId);
  return {
    success: true,
    message: decision === "accepted" ? "Приглашение принято. Теперь можно отправить предложение." : "Отказ отправлен заказчику.",
  };
}

export async function setProjectInvitationShortlisted(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const contractorId = String(formData.get("contractorId") ?? "");
  const shortlisted = String(formData.get("shortlisted") ?? "") === "true";
  if (!projectIdSchema.safeParse(projectId).success || !projectIdSchema.safeParse(contractorId).success) return;

  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "customer") return;

  await db.query(
    `
      UPDATE public.project_contractor_invitations i
      SET shortlisted_at=CASE WHEN $4::boolean THEN now() ELSE NULL END,
          updated_at=now()
      FROM public.projects p
      WHERE i.project_id=$1::uuid
        AND i.contractor_id=$2::uuid
        AND p.id=i.project_id
        AND p.customer_id=$3::uuid
        AND i.status <> 'cancelled'
    `,
    [projectId, contractorId, auth.user.id, shortlisted]
  );
  revalidateProject(projectId);
}

export async function cancelProjectInvitation(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const contractorId = String(formData.get("contractorId") ?? "");
  if (!projectIdSchema.safeParse(projectId).success || !projectIdSchema.safeParse(contractorId).success) return;

  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "customer") return;

  const result = await db.query<{ owner_id: string; title: string }>(
    `
      UPDATE public.project_contractor_invitations i
      SET status='cancelled', cancelled_at=now(), updated_at=now()
      FROM public.projects p, public.contractor_companies cc
      WHERE i.project_id=$1::uuid
        AND i.contractor_id=$2::uuid
        AND p.id=i.project_id
        AND p.customer_id=$3::uuid
        AND cc.id=i.contractor_id
        AND i.status IN ('invited','viewed')
      RETURNING cc.owner_id, p.title
    `,
    [projectId, contractorId, auth.user.id]
  );

  const row = result.rows[0];
  if (row) {
    await createNotification({
      userId: row.owner_id,
      actorId: auth.user.id,
      notificationType: "project_invitation_cancelled",
      title: "Приглашение к проекту отменено",
      body: row.title,
      projectId,
      url: "/contractor/projects",
      deduplicationKey: `project-invitation-cancelled:${projectId}:${contractorId}`,
      metadata: { contractor_id: contractorId },
    });
  }

  revalidateProject(projectId);
}

function revalidateProject(projectId: string) {
  revalidatePath(`/contractor/projects/${projectId}`);
  revalidatePath("/contractor/projects");
  revalidatePath(`/customer/projects/${projectId}/matches`);
  revalidatePath(`/customer/projects/${projectId}`);
}
