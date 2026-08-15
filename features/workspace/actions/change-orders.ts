"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

type AccessRow = {
  customer_id: string;
  contractor_owner_id: string | null;
  selected_contractor_id: string | null;
};

const changeSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  reason: z.string().trim().min(5).max(1500),
  scopeChange: z.string().trim().min(5).max(3000),
  amountDelta: z.coerce.number().min(-1000000000).max(1000000000),
  durationDeltaDays: z.coerce.number().int().min(-3650).max(3650),
});

const decisionSchema = z.object({
  projectId: z.string().uuid(),
  changeOrderId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(1500).optional(),
});

const paymentSchema = z.object({
  projectId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1000000000),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(1000).optional(),
});

export async function createChangeOrder(formData: FormData) {
  const parsed = changeSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    reason: formData.get("reason"),
    scopeChange: formData.get("scopeChange"),
    amountDelta: formData.get("amountDelta"),
    durationDeltaDays: formData.get("durationDeltaDays"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };

  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  const access = await getAccess(parsed.data.projectId, userId);
  if (!access) return { success: false, message: "Нет доступа к проекту" };

  await db.query(
    `
      INSERT INTO public.project_change_orders (
        project_id, requested_by, title, reason, scope_change,
        amount_delta, duration_delta_days
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      parsed.data.projectId,
      userId,
      parsed.data.title,
      parsed.data.reason,
      parsed.data.scopeChange,
      parsed.data.amountDelta,
      parsed.data.durationDeltaDays,
    ]
  );

  revalidate(parsed.data.projectId);
  return { success: true, message: "Изменение отправлено на согласование" };
}

export async function decideChangeOrder(formData: FormData) {
  const parsed = decisionSchema.safeParse({
    projectId: formData.get("projectId"),
    changeOrderId: formData.get("changeOrderId"),
    decision: formData.get("decision"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { success: false, message: "Некорректное решение" };

  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  const access = await getAccess(parsed.data.projectId, userId);
  if (!access || access.role !== "customer") {
    return { success: false, message: "Согласовать изменение может только заказчик" };
  }

  const result = await db.query(
    `
      UPDATE public.project_change_orders
      SET status = $1,
          decision_comment = $2,
          decided_by = $3,
          decided_at = now(),
          updated_at = now()
      WHERE id = $4
        AND project_id = $5
        AND status = 'pending'
      RETURNING id
    `,
    [parsed.data.decision, parsed.data.comment ?? null, userId, parsed.data.changeOrderId, parsed.data.projectId]
  );

  if (!result.rowCount) return { success: false, message: "Изменение уже обработано или не найдено" };
  revalidate(parsed.data.projectId);
  return { success: true, message: parsed.data.decision === "approved" ? "Изменение согласовано" : "Изменение отклонено" };
}

export async function cancelChangeOrder(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const changeOrderId = String(formData.get("changeOrderId") ?? "");
  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  const result = await db.query(
    `
      UPDATE public.project_change_orders
      SET status = 'cancelled', updated_at = now()
      WHERE id = $1 AND project_id = $2 AND requested_by = $3 AND status = 'pending'
      RETURNING id
    `,
    [changeOrderId, projectId, userId]
  );
  if (!result.rowCount) return { success: false, message: "Изменение нельзя отменить" };
  revalidate(projectId);
  return { success: true, message: "Запрос изменения отменён" };
}

export async function recordProjectPayment(formData: FormData) {
  const parsed = paymentSchema.safeParse({
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { success: false, message: "Проверьте сумму и дату платежа" };

  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };
  const access = await getAccess(parsed.data.projectId, userId);
  if (!access || access.role !== "customer") return { success: false, message: "Платежи фиксирует заказчик" };

  await db.query(
    `INSERT INTO public.project_payments (project_id, recorded_by, amount, paid_at, note)
     VALUES ($1,$2,$3,$4,$5)`,
    [parsed.data.projectId, userId, parsed.data.amount, parsed.data.paidAt, parsed.data.note ?? null]
  );
  revalidate(parsed.data.projectId);
  return { success: true, message: "Платёж добавлен" };
}

async function getAccess(projectId: string, userId: string) {
  const result = await db.query<AccessRow>(
    `
      SELECT p.customer_id, p.selected_contractor_id, cc.owner_id AS contractor_owner_id
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc ON cc.id = p.selected_contractor_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [projectId]
  );
  const row = result.rows[0];
  if (!row || !row.selected_contractor_id) return null;
  if (row.customer_id === userId) return { role: "customer" as const };
  if (row.contractor_owner_id === userId) return { role: "contractor" as const };
  return null;
}

function revalidate(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/changes`);
  revalidatePath(`/contractor/work/${projectId}/changes`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
}
