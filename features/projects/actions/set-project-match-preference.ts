"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

const schema = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid(),
  preference: z.enum(["saved", "dismissed", "neutral"]),
});

export async function setProjectMatchPreference(formData: FormData) {
  const parsed = schema.safeParse({
    projectId: formData.get("projectId"),
    contractorId: formData.get("contractorId"),
    preference: formData.get("preference"),
  });
  if (!parsed.success) return;

  const auth = await requireActiveUser();
  if (!auth.success || auth.profile.role !== "customer") return;

  const ownership = await db.query<{ id: string }>(
    `SELECT id FROM public.projects WHERE id=$1::uuid AND customer_id=$2::uuid LIMIT 1`,
    [parsed.data.projectId, auth.user.id]
  );
  if (!ownership.rows[0]) return;

  if (parsed.data.preference === "neutral") {
    await db.query(
      `DELETE FROM public.project_contractor_preferences
       WHERE project_id=$1::uuid AND contractor_id=$2::uuid AND customer_id=$3::uuid`,
      [parsed.data.projectId, parsed.data.contractorId, auth.user.id]
    );
  } else {
    await db.query(
      `INSERT INTO public.project_contractor_preferences(
         project_id, contractor_id, customer_id, preference, created_at, updated_at
       ) VALUES($1::uuid,$2::uuid,$3::uuid,$4,now(),now())
       ON CONFLICT(project_id,contractor_id) DO UPDATE SET
         customer_id=EXCLUDED.customer_id,
         preference=EXCLUDED.preference,
         updated_at=now()`,
      [parsed.data.projectId, parsed.data.contractorId, auth.user.id, parsed.data.preference]
    );
  }

  revalidatePath(`/customer/projects/${parsed.data.projectId}/matches`);
}
