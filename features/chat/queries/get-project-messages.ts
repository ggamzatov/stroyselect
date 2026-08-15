import "server-only";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";
import { getSignedFileUrl } from "@/lib/storage/get-signed-file-url";
import { getProjectChatAccess } from "@/features/chat/server/get-project-chat-access";

type MessageRow = {
  id: string;
  project_id: string;
  sender_id: string;
  message_text: string;
  is_deleted: boolean;
  deleted_at: Date | string | null;
  deleted_by: string | null;
  reply_to_id: string | null;
  edited_at: Date | string | null;
  created_at: Date | string;
  sender_first_name: string | null;
  sender_last_name: string | null;
  sender_role: string;
};

type AttachmentRow = {
  id: string;
  project_id: string;
  message_id: string;
  uploaded_by: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number | string;
  file_category: string;
  created_at: Date | string;
};

type NormalizedAttachment = Omit<AttachmentRow, "created_at"> & {
  created_at: string;
  signed_url: string | null;
};

type ReadRow = {
  project_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: Date | string;
  updated_at: Date | string;
};

export async function getProjectMessages(projectId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) throw new Error("Необходимо войти");

  const access = await getProjectChatAccess(projectId, userId);
  if (!access) throw new Error("У вас нет доступа к чату этого проекта");

  const [messagesResult, attachmentsResult, readsResult] = await Promise.all([
    db.query<MessageRow>(
      `
        SELECT
          m.id,
          m.project_id,
          m.sender_id,
          m.message_text,
          m.is_deleted,
          m.deleted_at,
          m.deleted_by,
          m.reply_to_id,
          m.edited_at,
          m.created_at,
          p.first_name AS sender_first_name,
          p.last_name AS sender_last_name,
          p.role::text AS sender_role
        FROM public.project_messages m
        JOIN public.profiles p ON p.id = m.sender_id
        WHERE m.project_id = $1
        ORDER BY m.created_at ASC
      `,
      [projectId]
    ),
    db.query<AttachmentRow>(
      `
        SELECT
          id, project_id, message_id, uploaded_by,
          storage_bucket, storage_path, original_name,
          mime_type, size_bytes, file_category, created_at
        FROM public.project_message_files
        WHERE project_id = $1
        ORDER BY created_at ASC
      `,
      [projectId]
    ),
    db.query<ReadRow>(
      `
        SELECT project_id, user_id, last_read_message_id, last_read_at, updated_at
        FROM public.project_chat_reads
        WHERE project_id = $1
      `,
      [projectId]
    ),
  ]);

  const attachmentsByMessage = new Map<string, NormalizedAttachment[]>();

  await Promise.all(
    attachmentsResult.rows.map(async (attachment) => {
      let signedUrl: string | null = null;

      try {
        signedUrl = await getSignedFileUrl({
          bucket: attachment.storage_bucket || "chat-files",
          key: attachment.storage_path,
          expiresIn: 60 * 60,
        });
      } catch (error) {
        console.error("Ошибка создания ссылки на вложение чата:", {
          attachmentId: attachment.id,
          error,
        });
      }

      const item: NormalizedAttachment = {
        ...attachment,
        created_at: toIsoString(attachment.created_at),
        signed_url: signedUrl,
      };

      const current = attachmentsByMessage.get(attachment.message_id) ?? [];
      current.push(item);
      attachmentsByMessage.set(attachment.message_id, current);
    })
  );

  const normalizedMessages = messagesResult.rows.map((row) => ({
    id: row.id,
    project_id: row.project_id,
    sender_id: row.sender_id,
    message_text: row.message_text,
    is_deleted: row.is_deleted,
    deleted_at: toNullableIsoString(row.deleted_at),
    deleted_by: row.deleted_by,
    reply_to_id: row.reply_to_id,
    edited_at: toNullableIsoString(row.edited_at),
    created_at: toIsoString(row.created_at),
    sender: {
      id: row.sender_id,
      first_name: row.sender_first_name ?? "Пользователь",
      last_name: row.sender_last_name,
      role: row.sender_role,
    },
    attachments: attachmentsByMessage.get(row.id) ?? [],
  }));

  const messageMap = new Map(
    normalizedMessages.map((message) => [message.id, message])
  );

  const messages = normalizedMessages.map((message) => {
    const replied = message.reply_to_id
      ? messageMap.get(message.reply_to_id) ?? null
      : null;

    return {
      ...message,
      replied_message: replied
        ? {
            id: replied.id,
            sender_id: replied.sender_id,
            message_text: replied.message_text,
            is_deleted: replied.is_deleted,
            created_at: replied.created_at,
            sender: replied.sender,
          }
        : null,
    };
  });

  const readStates = readsResult.rows.map((item) => ({
    ...item,
    last_read_at: toIsoString(item.last_read_at),
    updated_at: toIsoString(item.updated_at),
  }));

  const currentUserReadState =
    readStates.find((item) => item.user_id === userId) ?? null;

  const otherUserReadState =
    readStates.find((item) => item.user_id !== userId) ?? null;

  const lastReadAt = currentUserReadState?.last_read_at ?? null;

  const unreadCount = messages.filter(
    (message) =>
      message.sender_id !== userId &&
      (!lastReadAt || new Date(message.created_at) > new Date(lastReadAt))
  ).length;

  return {
    messages,
    unreadCount,
    currentUserReadState,
    otherUserReadState,
  };
}

function toNullableIsoString(value: Date | string | null) {
  return value ? toIsoString(value) : null;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

export type ProjectChatData = Awaited<ReturnType<typeof getProjectMessages>>;
