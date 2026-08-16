"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { writeAdminAudit } from "@/lib/observability/admin-audit";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["published", "hidden", "flagged"]),
  note: z.string().trim().max(3000).optional(),
});

export async function moderateContractorReview(formData: FormData) {
  const { user } = await requireStaffUser();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
  if (!parsed.success) return;

  const { id, status, note } = parsed.data;
  const result = await db.query<{ contractor_id: string; project_id: string }>(
    `
      UPDATE public.contractor_reviews
      SET moderation_status=$2,
          moderation_note=$3,
          moderated_by=$4::uuid,
          moderated_at=now(),
          updated_at=now()
      WHERE id=$1::uuid
      RETURNING contractor_id, project_id
    `,
    [id, status, note ?? null, user.id]
  );

  const row = result.rows[0];
  if (!row) return;
  await writeAdminAudit({
    actorId: user.id,
    action: `contractor_review_${status}`,
    entityType: "contractor_review",
    entityId: id,
    reason: note ?? null,
    metadata: { contractor_id: row.contractor_id, project_id: row.project_id },
  });

  revalidatePath("/admin/reviews");
  revalidatePath(`/customer/contractors/${row.contractor_id}`);
}
