"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { createAdminAuditLog } from "@/features/admin/audit/server/create-admin-audit-log";

const schema = z.object({
  contractorId: z.string().uuid(),
  source: z.enum(["fns_egrul_egrip", "fns_transparent_business", "sro_registry", "license_registry", "other"]),
  identifierType: z.enum(["inn", "ogrn", "license", "sro", "other"]),
  identifierValue: z.string().trim().min(3).max(128),
  status: z.enum(["matched", "mismatch", "error"]),
  note: z.string().trim().max(2000).optional(),
});

type Input = z.infer<typeof schema>;

export async function recordContractorRegistryCheck(input: Input) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные проверки" };
  }

  const { user } = await requireStaffUser();

  const companyResult = await db.query<{ id: string; public_name: string }>(
    `SELECT id,public_name FROM public.contractor_companies WHERE id=$1::uuid LIMIT 1`,
    [parsed.data.contractorId]
  );
  const company = companyResult.rows[0];
  if (!company) return { success: false, message: "Подрядчик не найден" };

  const result = await db.query<{ id: string }>(
    `
      INSERT INTO public.contractor_registry_checks(
        contractor_id,source,identifier_type,identifier_value,status,payload,checked_at,reviewed_by,reviewed_at,review_note
      )
      VALUES($1::uuid,$2,$3,$4,$5,'{}'::jsonb,now(),$6::uuid,now(),NULLIF(trim($7),''))
      RETURNING id
    `,
    [
      parsed.data.contractorId,
      parsed.data.source,
      parsed.data.identifierType,
      parsed.data.identifierValue,
      parsed.data.status,
      user.id,
      parsed.data.note ?? "",
    ]
  );

  await createAdminAuditLog({
    adminId: user.id,
    actionType: "contractor_registry_check_recorded",
    entityType: "contractor",
    entityId: parsed.data.contractorId,
    description: `Зафиксирована проверка реестра для компании «${company.public_name}»`,
    metadata: {
      check_id: result.rows[0]?.id,
      source: parsed.data.source,
      identifier_type: parsed.data.identifierType,
      identifier_value: parsed.data.identifierValue,
      status: parsed.data.status,
      note: parsed.data.note ?? null,
    },
  });

  revalidatePath(`/admin/contractors/${parsed.data.contractorId}`);
  revalidatePath("/admin/data-quality");
  return { success: true, message: "Результат проверки сохранён" };
}
