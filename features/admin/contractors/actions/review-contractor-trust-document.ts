"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createAdminAuditLog } from "@/features/admin/audit/server/create-admin-audit-log";
import { createNotification } from "@/features/notifications/server/create-notification";

const schema = z.object({
  contractorId: z.string().uuid(),
  documentId: z.string().uuid(),
  decision: z.enum(["verify", "reject"]),
  comment: z.string().trim().max(2000).optional(),
});
const STAFF_ROLES = new Set(["admin", "moderator", "manager"]);

export async function reviewContractorTrustDocument(formData: FormData) {
  const parsed = schema.safeParse({
    contractorId: formData.get("contractorId"),
    documentId: formData.get("documentId"),
    decision: formData.get("decision"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return;

  const auth = await requireActiveUser();
  if (!auth.success || !STAFF_ROLES.has(auth.profile.role)) return;
  const { contractorId, documentId, decision } = parsed.data;
  const status = decision === "verify" ? "verified" : "rejected";
  const comment = parsed.data.comment?.trim() || null;
  if (status === "rejected" && (!comment || comment.length < 3)) return;

  const result = await db.query<{ owner_id: string; public_name: string; title: string }>(
    `UPDATE public.contractor_verification_documents d
     SET status=$1,review_comment=$2,reviewed_by=$3::uuid,reviewed_at=now(),updated_at=now()
     FROM public.contractor_companies cc
     WHERE d.id=$4::uuid AND d.contractor_id=$5::uuid AND cc.id=d.contractor_id
     RETURNING cc.owner_id,cc.public_name,d.title`,
    [status, comment, auth.user.id, documentId, contractorId]
  );
  const row = result.rows[0];
  if (!row) return;

  await db.query(
    `INSERT INTO public.contractor_verification_history(contractor_id,status,comment,changed_by,metadata)
     VALUES($1::uuid,$2,$3,$4::uuid,$5::jsonb)`,
    [contractorId, `document_${status}`, comment, auth.user.id, JSON.stringify({ document_id: documentId, title: row.title })]
  );
  await createAdminAuditLog({
    adminId: auth.user.id,
    actionType: `contractor_document_${status}`,
    entityType: "contractor",
    entityId: contractorId,
    description: `Документ «${row.title}» компании «${row.public_name}»: ${status}`,
    metadata: { document_id: documentId, status, comment },
  });
  try {
    await createNotification({
      userId: row.owner_id,
      actorId: auth.user.id,
      notificationType: status === "verified" ? "company_document_verified" : "company_document_rejected",
      title: status === "verified" ? "Документ подтверждён" : "Документ требует исправления",
      body: status === "verified" ? `Документ «${row.title}» прошёл проверку.` : `Документ «${row.title}» отклонён.${comment ? ` Причина: ${comment}` : ""}`,
      url: "/contractor/company/trust",
      metadata: { contractor_id: contractorId, document_id: documentId, status },
    });
  } catch (error) {
    console.error("Ошибка уведомления о trust-документе:", error);
  }

  revalidatePath(`/admin/contractors/${contractorId}/trust`);
  revalidatePath(`/admin/contractors/${contractorId}`);
  revalidatePath("/contractor/company/trust");
  revalidatePath(`/contractors/${contractorId}`);
}
