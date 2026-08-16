"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { enforceRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { getProjectChatAccess } from "@/features/chat/server/get-project-chat-access";
import { createNotification } from "@/features/notifications/server/create-notification";
import { getProjectNotificationRecipient } from "@/features/notifications/server/get-project-notification-recipient";

const sendProjectMessageSchema = z.object({
  projectId: z.string().uuid("Некорректный идентификатор проекта"),
  messageText: z.string().trim().min(1, "Введите сообщение").max(5000, "Сообщение слишком длинное"),
  replyToId: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.string().uuid("Некорректное сообщение для ответа").optional()
  ),
});

export type SendProjectMessageInput = z.infer<typeof sendProjectMessageSchema>;
export type SendProjectMessageResult = { success: boolean; message: string; messageId?: string };

export async function sendProjectMessage(input: SendProjectMessageInput): Promise<SendProjectMessageResult> {
  const parsed = sendProjectMessageSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте сообщение" };

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };

  const { user, profile } = activeUser;
  if (!["customer", "contractor"].includes(profile.role)) {
    return { success: false, message: "У вас нет доступа к чату проектов" };
  }

  const { projectId, messageText, replyToId } = parsed.data;
  const limit = await enforceRateLimit({
    scope: `chat:send:${projectId}`,
    identity: user.id,
    limit: 30,
    windowSeconds: 60,
    blockSeconds: 60,
  });
  if (!limit.allowed) return { success: false, message: rateLimitMessage(limit) };

  const activeProject = await requireActiveProject(projectId);
  if (!activeProject.success) return { success: false, message: activeProject.message };

  const access = await getProjectChatAccess(projectId, user.id);
  if (!access || (!access.isCustomer && !access.isContractor)) {
    return { success: false, message: "У вас нет доступа к чату этого проекта" };
  }

  if (!["contractor_selected", "in_progress", "completed", "disputed"].includes(access.project.status)) {
    return { success: false, message: "Чат пока недоступен для этого проекта" };
  }

  if (replyToId) {
    const replyResult = await db.query<{ id: string; is_deleted: boolean }>(
      `SELECT id, is_deleted FROM public.project_messages WHERE id = $1::uuid AND project_id = $2::uuid LIMIT 1`,
      [replyToId, projectId]
    );
    const repliedMessage = replyResult.rows[0];
    if (!repliedMessage) return { success: false, message: "Исходное сообщение не найдено" };
    if (repliedMessage.is_deleted) return { success: false, message: "Нельзя ответить на удалённое сообщение" };
  }

  const normalizedMessage = messageText.trim();
  let createdMessage: { id: string } | undefined;
  try {
    const result = await db.query<{ id: string }>(
      `
        INSERT INTO public.project_messages (
          project_id, sender_id, message_text, reply_to_id,
          edited_at, is_deleted, deleted_at, deleted_by
        )
        VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid, NULL, false, NULL, NULL)
        RETURNING id
      `,
      [projectId, user.id, normalizedMessage, replyToId ?? null]
    );
    createdMessage = result.rows[0];
  } catch (error) {
    console.error("Ошибка отправки сообщения:", error);
    return { success: false, message: "Не удалось отправить сообщение" };
  }

  if (!createdMessage) return { success: false, message: "Не удалось отправить сообщение" };

  try {
    const recipient = await getProjectNotificationRecipient(projectId, user.id);
    if (recipient) {
      const result = await createNotification({
        userId: recipient.recipientUserId,
        actorId: user.id,
        notificationType: "new_message",
        title: "Новое сообщение",
        body: getNotificationPreview(normalizedMessage),
        projectId,
        messageId: createdMessage.id,
        url: recipient.recipientRole === "customer" ? `/customer/work/${projectId}` : `/contractor/work/${projectId}`,
        metadata: { sender_id: user.id, reply_to_id: replyToId ?? null },
        deduplicationKey: `chat-message:${createdMessage.id}`,
      });
      if (!result.success) console.error("Не удалось создать уведомление о новом сообщении:", result.message);
    }
  } catch (error) {
    console.error("Ошибка создания уведомления о сообщении:", error);
  }

  revalidateChatPages(projectId);
  return { success: true, message: "Сообщение отправлено", messageId: createdMessage.id };
}

function revalidateChatPages(projectId: string) {
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath(`/customer/projects/${projectId}`);
  revalidatePath("/customer/dashboard");
  revalidatePath("/contractor/dashboard");
  revalidatePath("/customer", "layout");
  revalidatePath("/contractor", "layout");
}

function getNotificationPreview(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= 120 ? normalized : `${normalized.slice(0, 117)}...`;
}
