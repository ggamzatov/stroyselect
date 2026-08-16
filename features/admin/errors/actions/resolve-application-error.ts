"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { writeAdminAudit } from "@/lib/observability/admin-audit";

export async function resolveApplicationError(formData: FormData) {
  const { user } = await requireStaffUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  const result = await db.query(
    `UPDATE public.application_errors
     SET resolved_at = coalesce(resolved_at, now()),
         resolved_by = coalesce(resolved_by, $2::uuid)
     WHERE id = $1::uuid
     RETURNING id`,
    [id, user.id]
  );

  if (result.rowCount) {
    await writeAdminAudit({
      actorId: user.id,
      action: "application_error_resolved",
      entityType: "application_error",
      entityId: id,
    });
  }

  revalidatePath("/admin/errors");
}
