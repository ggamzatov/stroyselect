"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getProjectChatAccess } from "@/features/chat/server/get-project-chat-access";

const markReadSchema = z.object({
  projectId: z.string().uuid(),
  messageId: z.string().uuid(),
  messageCreatedAt: z.string().datetime({ offset: true }),
});

type MarkReadInput = z.infer<typeof markReadSchema>;

export type MarkProjectMessagesReadResult = {
  success: boolean;
  message: string;
};

export async function markProjectMessagesRead(
  input: MarkReadInput
): Promise<MarkProjectMessagesReadResult> {
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };

  const { projectId, messageId } = parsed.data;
  const access = await getProjectChatAccess(projectId, activeUser.user.id);
  if (!access) return { success: false, message: "У вас нет доступа к чату этого проекта" };

  const messageResult = await db.query<{ id: string; created_at: Date | string }>(
    `SELECT id, created_at FROM public.project_messages WHERE id = $1 AND project_id = $2 LIMIT 1`,
    [messageId, projectId]
  );

  const message = messageResult.rows[0];
  if (!message) return { success: false, message: "Сообщение не найдено" };

  const safeReadAt = message.created_at instanceof Date
    ? message.created_at.toISOString()
    : String(message.created_at);

  try {
    await db.query(
      `
        INSERT INTO public.project_chat_reads (
          project_id, user_id, last_read_message_id, last_read_at, updated_at
        )
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (project_id, user_id)
        DO UPDATE SET
          last_read_message_id = EXCLUDED.last_read_message_id,
          last_read_at = GREATEST(public.project_chat_reads.last_read_at, EXCLUDED.last_read_at),
          updated_at = now()
      `,
      [projectId, activeUser.user.id, messageId, safeReadAt]
    );
  } catch (error) {
    console.error("Ошибка отметки сообщений:", error);
    return { success: false, message: "Не удалось отметить сообщения прочитанными" };
  }

  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  return { success: true, message: "Сообщения отмечены прочитанными" };
}
