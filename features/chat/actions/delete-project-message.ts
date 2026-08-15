"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/lib/db/pool";
import { s3 } from "@/lib/storage/s3";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getProjectChatAccess } from "@/features/chat/server/get-project-chat-access";

const deleteProjectMessageSchema = z.object({
  messageId: z.string().uuid("Некорректный идентификатор сообщения"),
  projectId: z.string().uuid("Некорректный идентификатор проекта"),
});

type DeleteProjectMessageInput = z.infer<typeof deleteProjectMessageSchema>;
export type DeleteProjectMessageResult = { success: boolean; message: string };

type AttachmentRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

export async function deleteProjectMessage(
  input: DeleteProjectMessageInput
): Promise<DeleteProjectMessageResult> {
  const parsed = deleteProjectMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные сообщения" };
  }

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };

  const { messageId, projectId } = parsed.data;
  const access = await getProjectChatAccess(projectId, activeUser.user.id);
  if (!access || (!access.isCustomer && !access.isContractor)) {
    return { success: false, message: "У вас нет доступа к чату этого проекта" };
  }

  const client = await db.connect();
  let attachments: AttachmentRow[] = [];

  try {
    await client.query("BEGIN");

    const messageResult = await client.query<{ id: string; is_deleted: boolean }>(
      `
        SELECT id, is_deleted
        FROM public.project_messages
        WHERE id = $1
          AND project_id = $2
          AND sender_id = $3
        LIMIT 1
        FOR UPDATE
      `,
      [messageId, projectId, activeUser.user.id]
    );

    const existing = messageResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return { success: false, message: "Сообщение не найдено или недоступно" };
    }

    if (existing.is_deleted) {
      await client.query("ROLLBACK");
      return { success: true, message: "Сообщение уже удалено" };
    }

    const attachmentsResult = await client.query<AttachmentRow>(
      `
        SELECT id, storage_bucket, storage_path
        FROM public.project_message_files
        WHERE message_id = $1
          AND project_id = $2
          AND uploaded_by = $3
        FOR UPDATE
      `,
      [messageId, projectId, activeUser.user.id]
    );

    attachments = attachmentsResult.rows;

    await client.query(
      `
        DELETE FROM public.project_message_files
        WHERE message_id = $1
          AND project_id = $2
          AND uploaded_by = $3
      `,
      [messageId, projectId, activeUser.user.id]
    );

    const update = await client.query<{ id: string }>(
      `
        UPDATE public.project_messages
        SET
          message_text = 'Сообщение удалено',
          is_deleted = true,
          deleted_at = now(),
          deleted_by = $1,
          edited_at = NULL
        WHERE id = $2
          AND project_id = $3
          AND sender_id = $1
          AND is_deleted = false
        RETURNING id
      `,
      [activeUser.user.id, messageId, projectId]
    );

    if (!update.rows[0]) throw new Error("Сообщение не было удалено");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка мягкого удаления сообщения:", error);
    return { success: false, message: "Не удалось удалить сообщение" };
  } finally {
    client.release();
  }

  for (const attachment of attachments) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: attachment.storage_bucket || "chat-files",
          Key: attachment.storage_path,
        })
      );
    } catch (error) {
      console.error("Запись вложения удалена, но объект S3 удалить не удалось:", {
        attachmentId: attachment.id,
        storagePath: attachment.storage_path,
        error,
      });
    }
  }

  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath(`/contractor/work/${projectId}`);
  return { success: true, message: "Сообщение удалено" };
}
