"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { notifyProjectParticipant } from "@/features/notifications/server/notify-project-participant";
import { getCurrentSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/pool";
import { enforceRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";

const openSchema = z.object({
  projectId: z.string().uuid(),
  subject: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(5000),
  stageId: z.string().uuid().optional(),
  changeOrderId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
});

const messageSchema = z.object({
  projectId: z.string().uuid(),
  disputeId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export async function openProjectDispute(formData: FormData) {
  const parsed = openSchema.safeParse({
    projectId: formData.get("projectId"),
    subject: formData.get("subject"),
    description: formData.get("description"),
    stageId: optional(formData.get("stageId")),
    changeOrderId: optional(formData.get("changeOrderId")),
    paymentId: optional(formData.get("paymentId")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Проверьте данные",
    };
  }

  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  const limited = await limitMutation("dispute:open", userId, 6, 3600, 1800);
  if (limited) return limited;

  if (!(await hasAccess(parsed.data.projectId, userId))) {
    return { success: false, message: "Нет доступа" };
  }

  let disputeId: string | undefined;
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ id: string }>(
      `
        INSERT INTO public.project_disputes(
          project_id,opened_by,stage_id,change_order_id,payment_id,subject,description
        )
        VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7)
        RETURNING id
      `,
      [
        parsed.data.projectId,
        userId,
        parsed.data.stageId ?? null,
        parsed.data.changeOrderId ?? null,
        parsed.data.paymentId ?? null,
        parsed.data.subject,
        parsed.data.description,
      ]
    );

    disputeId = result.rows[0]?.id;

    await audit(
      client,
      parsed.data.projectId,
      userId,
      "dispute_opened",
      "dispute",
      disputeId ?? null,
      { subject: parsed.data.subject }
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка открытия спора:", error);
    return { success: false, message: "Не удалось открыть спор" };
  } finally {
    client.release();
  }

  await notifyProjectParticipant({
    projectId: parsed.data.projectId,
    actorUserId: userId,
    notificationType: "dispute_opened",
    title: "Открыт спор по проекту",
    body: parsed.data.subject,
    customerUrl: `/customer/work/${parsed.data.projectId}/disputes`,
    contractorUrl: `/contractor/work/${parsed.data.projectId}/disputes`,
    deduplicationKey: disputeId ? `dispute-opened:${disputeId}` : null,
    metadata: { dispute_id: disputeId ?? null },
  });

  refresh(parsed.data.projectId);
  return { success: true, message: "Спор открыт" };
}

export async function addDisputeMessage(formData: FormData) {
  const parsed = messageSchema.safeParse({
    projectId: formData.get("projectId"),
    disputeId: formData.get("disputeId"),
    body: formData.get("body"),
  });

  if (!parsed.success) return { success: false, message: "Введите сообщение" };

  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Нет доступа" };

  const limited = await limitMutation(
    `dispute:message:${parsed.data.disputeId}`,
    userId,
    20,
    60,
    60
  );
  if (limited) return limited;

  if (!(await hasAccess(parsed.data.projectId, userId))) {
    return { success: false, message: "Нет доступа" };
  }

  const result = await db.query<{ id: string }>(
    `
      INSERT INTO public.project_dispute_messages(dispute_id,author_id,body)
      SELECT d.id,$3::uuid,$4::text
      FROM public.project_disputes d
      WHERE d.id=$1::uuid
        AND d.project_id=$2::uuid
        AND d.status IN ('open','under_review')
      RETURNING id
    `,
    [parsed.data.disputeId, parsed.data.projectId, userId, parsed.data.body]
  );

  if (!result.rowCount) {
    const existing = await db.query<{ status: string }>(
      `SELECT status FROM public.project_disputes WHERE id=$1::uuid AND project_id=$2::uuid LIMIT 1`,
      [parsed.data.disputeId, parsed.data.projectId]
    );
    return {
      success: false,
      message: existing.rows[0]
        ? "Спор уже завершён. Для нового требования откройте новый спор."
        : "Спор не найден",
    };
  }

  const messageId = result.rows[0]?.id;
  await db.query(
    `
      INSERT INTO public.project_audit_log(project_id,actor_id,action,entity_type,entity_id,payload)
      VALUES($1::uuid,$2::uuid,'dispute_message_added','dispute',$3::text,$4::jsonb)
    `,
    [
      parsed.data.projectId,
      userId,
      parsed.data.disputeId,
      JSON.stringify({ message_id: messageId }),
    ]
  );

  await notifyProjectParticipant({
    projectId: parsed.data.projectId,
    actorUserId: userId,
    notificationType: "dispute_message_added",
    title: "Новое сообщение в споре",
    body: parsed.data.body.slice(0, 180),
    customerUrl: `/customer/work/${parsed.data.projectId}/disputes`,
    contractorUrl: `/contractor/work/${parsed.data.projectId}/disputes`,
    deduplicationKey: messageId ? `dispute-message:${messageId}` : null,
    metadata: {
      dispute_id: parsed.data.disputeId,
      message_id: messageId ?? null,
    },
  });

  refresh(parsed.data.projectId);
  return { success: true, message: "Сообщение добавлено" };
}

async function limitMutation(
  scope: string,
  userId: string,
  limit: number,
  windowSeconds: number,
  blockSeconds: number
) {
  const result = await enforceRateLimit({
    scope,
    identity: userId,
    limit,
    windowSeconds,
    blockSeconds,
  });
  return result.allowed
    ? null
    : { success: false, message: rateLimitMessage(result) };
}

async function hasAccess(projectId: string, userId: string) {
  const result = await db.query(
    `
      SELECT 1
      FROM public.projects p
      LEFT JOIN public.contractor_companies cc ON cc.id=p.selected_contractor_id
      WHERE p.id=$1::uuid
        AND (p.customer_id=$2::uuid OR cc.owner_id=$2::uuid)
    `,
    [projectId, userId]
  );
  return Boolean(result.rowCount);
}

async function audit(
  client: { query: (query: string, values?: unknown[]) => Promise<unknown> },
  projectId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  payload: Record<string, unknown>
) {
  await client.query(
    `
      INSERT INTO public.project_audit_log(project_id,actor_id,action,entity_type,entity_id,payload)
      VALUES($1::uuid,$2::uuid,$3::varchar(100),$4::varchar(80),$5::text,$6::jsonb)
    `,
    [projectId, actorId, action, entityType, entityId, JSON.stringify(payload)]
  );
}

function optional(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function refresh(projectId: string) {
  revalidatePath(`/customer/work/${projectId}/disputes`);
  revalidatePath(`/contractor/work/${projectId}/disputes`);
}
