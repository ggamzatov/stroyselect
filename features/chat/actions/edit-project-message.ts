"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getProjectChatAccess } from "@/features/chat/server/get-project-chat-access";

const editProjectMessageSchema = z.object({
  messageId: z.string().uuid("Некорректный идентификатор сообщения"),
  projectId: z.string().uuid("Некорректный идентификатор проекта"),
  messageText: z.string().trim().min(1, "Сообщение не может быть пустым").max(5000, "Сообщение слишком длинное"),
});

type EditProjectMessageInput = z.infer<typeof editProjectMessageSchema>;
export type EditProjectMessageResult = { success: boolean; message: string };

export async function editProjectMessage(
  input: EditProjectMessageInput
): Promise<EditProjectMessageResult> {
  const parsed = editProjectMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте сообщение" };
  }

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };

  const { messageId, projectId, messageText } = parsed.data;
  const access = await getProjectChatAccess(projectId, activeUser.user.id);
  if (!access) return { success: false, message: "У вас нет доступа к чату этого проекта" };

  const result = await db.query<{
    id: string;
    message_text: string;
    is_deleted: boolean;
  }>(
    `
      SELECT id, message_text, is_deleted
      FROM public.project_messages
      WHERE id = $1 AND project_id = $2 AND sender_id = $3
      LIMIT 1
    `,
    [messageId, projectId, activeUser.user.id]
  );

  const existing = result.rows[0];
  if (!existing) return { success: false, message: "Сообщение не найдено или недоступно" };
  if (existing.is_deleted) return { success: false, message: "Удалённое сообщение нельзя изменить" };

  const normalizedText = messageText.trim();
  if (normalizedText === existing.message_text) {
    return { success: true, message: "Изменений в сообщении нет" };
  }

  try {
    const update = await db.query<{ id: string }>(
      `
        UPDATE public.project_messages
        SET message_text = $1, edited_at = now()
        WHERE id = $2 AND project_id = $3 AND sender_id = $4 AND is_deleted = false
        RETURNING id
      `,
      [normalizedText, messageId, projectId, activeUser.user.id]
    );
    if (!update.rows[0]) return { success: false, message: "Не удалось изменить сообщение" };
  } catch (error) {
    console.error("Ошибка редактирования сообщения:", error);
    return { success: false, message: "Не удалось изменить сообщение" };
  }

  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  return { success: true, message: "Сообщение изменено" };
}
