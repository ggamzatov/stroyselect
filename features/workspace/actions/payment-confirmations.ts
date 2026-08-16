"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createNotification } from "@/features/notifications/server/create-notification";

const schema = z.object({
  paymentId: z.string().uuid(),
  projectId: z.string().uuid(),
});

const disputeSchema = schema.extend({ reason: z.string().trim().min(5).max(3000) });

export async function confirmProjectPayment(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Некорректный платёж" };
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };

  const access = await paymentAccess(parsed.data.paymentId, parsed.data.projectId, auth.user.id);
  if (!access) return { success: false, message: "Платёж не найден" };

  const column = access.role === "customer" ? "customer_confirmed_at" : "contractor_confirmed_at";
  const result = await db.query<{ status: string; customer_confirmed_at: Date | null; contractor_confirmed_at: Date | null }>(
    `
      INSERT INTO public.project_payment_confirmations(payment_id,project_id,${column},updated_at)
      VALUES($1::uuid,$2::uuid,now(),now())
      ON CONFLICT(payment_id) DO UPDATE SET
        ${column}=COALESCE(public.project_payment_confirmations.${column},now()),
        status=CASE
          WHEN public.project_payment_confirmations.status IN ('disputed','cancelled') THEN public.project_payment_confirmations.status
          WHEN COALESCE(public.project_payment_confirmations.customer_confirmed_at, CASE WHEN '${column}'='customer_confirmed_at' THEN now() END) IS NOT NULL
           AND COALESCE(public.project_payment_confirmations.contractor_confirmed_at, CASE WHEN '${column}'='contractor_confirmed_at' THEN now() END) IS NOT NULL
          THEN 'confirmed' ELSE 'pending' END,
        updated_at=now()
      RETURNING status,customer_confirmed_at,contractor_confirmed_at
    `,
    [parsed.data.paymentId, parsed.data.projectId]
  );

  const state = result.rows[0];
  if (!state) return { success: false, message: "Не удалось подтвердить платёж" };
  await notifyOtherParty(parsed.data.projectId, auth.user.id, "payment_confirmation_updated", state.status === "confirmed" ? "Платёж подтверждён обеими сторонами" : "Получено подтверждение платежа");
  revalidatePaymentPages(parsed.data.projectId);
  return { success: true, message: state.status === "confirmed" ? "Платёж подтверждён обеими сторонами" : "Ваше подтверждение сохранено" };
}

export async function disputeProjectPayment(input: unknown) {
  const parsed = disputeSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Укажите причину" };
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  const access = await paymentAccess(parsed.data.paymentId, parsed.data.projectId, auth.user.id);
  if (!access) return { success: false, message: "Платёж не найден" };

  await db.query(
    `
      INSERT INTO public.project_payment_confirmations(payment_id,project_id,status,disputed_at,disputed_by,dispute_reason,updated_at)
      VALUES($1::uuid,$2::uuid,'disputed',now(),$3::uuid,$4,now())
      ON CONFLICT(payment_id) DO UPDATE SET
        status='disputed',disputed_at=now(),disputed_by=$3::uuid,dispute_reason=$4,updated_at=now()
    `,
    [parsed.data.paymentId, parsed.data.projectId, auth.user.id, parsed.data.reason]
  );
  await notifyOtherParty(parsed.data.projectId, auth.user.id, "payment_disputed", "Платёж оспорен");
  revalidatePaymentPages(parsed.data.projectId);
  return { success: true, message: "Платёж отмечен как спорный" };
}

export async function cancelProjectPaymentConfirmation(input: unknown) {
  const parsed = disputeSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Укажите причину" };
  const auth = await requireActiveUser();
  if (!auth.success) return { success: false, message: auth.message };
  const access = await paymentAccess(parsed.data.paymentId, parsed.data.projectId, auth.user.id);
  if (!access || access.role !== "customer") return { success: false, message: "Отменить платёж может только заказчик" };

  await db.query(
    `
      INSERT INTO public.project_payment_confirmations(payment_id,project_id,status,cancelled_at,cancelled_by,cancellation_reason,updated_at)
      VALUES($1::uuid,$2::uuid,'cancelled',now(),$3::uuid,$4,now())
      ON CONFLICT(payment_id) DO UPDATE SET
        status='cancelled',cancelled_at=now(),cancelled_by=$3::uuid,cancellation_reason=$4,updated_at=now()
    `,
    [parsed.data.paymentId, parsed.data.projectId, auth.user.id, parsed.data.reason]
  );
  await notifyOtherParty(parsed.data.projectId, auth.user.id, "payment_cancelled", "Заказчик отменил подтверждение платежа");
  revalidatePaymentPages(parsed.data.projectId);
  return { success: true, message: "Платёж отменён в журнале подтверждений" };
}

async function paymentAccess(paymentId: string, projectId: string, userId: string) {
  const result = await db.query<{ customer_id: string; contractor_owner_id: string | null }>(
    `
      SELECT p.customer_id,cc.owner_id AS contractor_owner_id
      FROM public.project_payments pp
      JOIN public.projects p ON p.id=pp.project_id
      LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
      WHERE pp.id=$1::uuid AND pp.project_id=$2::uuid
      LIMIT 1
    `,
    [paymentId, projectId]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.customer_id === userId) return { role: "customer" as const };
  if (row.contractor_owner_id === userId) return { role: "contractor" as const };
  return null;
}

async function notifyOtherParty(projectId: string, actorId: string, type: string, title: string) {
  const result = await db.query<{ customer_id: string; contractor_owner_id: string | null; title: string }>(
    `SELECT p.customer_id,cc.owner_id AS contractor_owner_id,p.title FROM public.projects p LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id WHERE p.id=$1::uuid`,
    [projectId]
  );
  const row = result.rows[0];
  if (!row) return;
  const recipient = row.customer_id === actorId ? row.contractor_owner_id : row.customer_id;
  if (!recipient) return;
  await createNotification({
    userId: recipient,
    actorId,
    notificationType: type,
    title,
    body: row.title,
    projectId,
    url: row.customer_id === recipient ? `/customer/work/${projectId}/changes` : `/contractor/work/${projectId}/changes`,
    deduplicationKey: `${type}:${projectId}:${Date.now()}`,
    metadata: { project_id: projectId },
  });
}

function revalidatePaymentPages(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/changes`);
  revalidatePath(`/contractor/work/${projectId}/changes`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
}
