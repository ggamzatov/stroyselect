"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/lib/db/pool";
import { s3 } from "@/lib/storage/s3";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { enforceRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { getProjectChatAccess } from "@/features/chat/server/get-project-chat-access";
import { chatAttachmentSchema } from "@/features/chat/schemas/chat-attachment-schema";
import { createNotification } from "@/features/notifications/server/create-notification";
import { getProjectNotificationRecipient } from "@/features/notifications/server/get-project-notification-recipient";

export type SendChatAttachmentResult = {
  success: boolean;
  message: string;
  messageId?: string;
  fileId?: string;
};

const CHAT_FILES_BUCKET = "chat-files";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
]);

export async function sendChatAttachment(
  formData: FormData
): Promise<SendChatAttachmentResult> {
  const parsed = chatAttachmentSchema.safeParse({
    projectId: formData.get("projectId"),
    messageText: formData.get("messageText") ?? "",
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) return { success: false, message: "Выберите файл" };
  if (fileValue.size <= 0) return { success: false, message: "Файл пустой" };
  if (fileValue.size > MAX_FILE_SIZE) {
    return { success: false, message: "Размер файла не должен превышать 20 МБ" };
  }
  if (!ALLOWED_MIME_TYPES.has(fileValue.type)) {
    return { success: false, message: "Этот формат файла не поддерживается" };
  }

  const { projectId, messageText } = parsed.data;
  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false, message: activeUser.message };

  const { user, profile } = activeUser;
  if (!["customer", "contractor"].includes(profile.role)) {
    return { success: false, message: "У вас нет доступа к чату проекта" };
  }

  const uploadLimit = await enforceRateLimit({
    scope: `chat:attachment:${projectId}`,
    identity: user.id,
    limit: 8,
    windowSeconds: 5 * 60,
    blockSeconds: 5 * 60,
  });
  if (!uploadLimit.allowed) {
    return { success: false, message: rateLimitMessage(uploadLimit) };
  }

  const activeProject = await requireActiveProject(projectId);
  if (!activeProject.success) return { success: false, message: activeProject.message };

  const access = await getProjectChatAccess(projectId, user.id);
  if (!access || (!access.isCustomer && !access.isContractor)) {
    return { success: false, message: "У вас нет доступа к чату этого проекта" };
  }

  if (!["contractor_selected", "in_progress", "completed", "disputed"].includes(access.project.status)) {
    return { success: false, message: "Чат пока недоступен для этого проекта" };
  }

  const normalizedText = messageText?.trim() || fileValue.name;
  const messageId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const extension = getSafeFileExtension(fileValue.name);
  const storagePath = `${projectId}/${messageId}/${crypto.randomUUID()}${extension}`;
  const body = Buffer.from(await fileValue.arrayBuffer());

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: CHAT_FILES_BUCKET,
        Key: storagePath,
        Body: body,
        ContentType: fileValue.type,
        CacheControl: "3600",
      })
    );
  } catch (error) {
    console.error("Ошибка загрузки вложения чата в S3:", error);
    return { success: false, message: "Не удалось загрузить файл" };
  }

  const fileCategory = getFileCategory(fileValue.type);
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO public.project_messages (
          id, project_id, sender_id, message_text, reply_to_id,
          edited_at, is_deleted, deleted_at, deleted_by
        )
        VALUES ($1, $2, $3, $4, NULL, NULL, false, NULL, NULL)
      `,
      [messageId, projectId, user.id, normalizedText]
    );

    await client.query(
      `
        INSERT INTO public.project_message_files (
          id, project_id, message_id, uploaded_by, storage_bucket, storage_path,
          original_name, mime_type, size_bytes, file_category
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        fileId,
        projectId,
        messageId,
        user.id,
        CHAT_FILES_BUCKET,
        storagePath,
        fileValue.name,
        fileValue.type,
        fileValue.size,
        fileCategory,
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: CHAT_FILES_BUCKET,
          Key: storagePath,
        })
      );
    } catch (cleanupError) {
      console.error("Ошибка компенсационного удаления вложения:", cleanupError);
    }

    console.error("Ошибка сохранения вложения чата:", error);
    return { success: false, message: "Не удалось сохранить вложение" };
  } finally {
    client.release();
  }

  try {
    const recipient = await getProjectNotificationRecipient(projectId, user.id);
    if (recipient) {
      await createNotification({
        userId: recipient.recipientUserId,
        actorId: user.id,
        notificationType: "file_uploaded",
        title: "Получен файл",
        body: getFileNotificationPreview(fileValue.name, normalizedText),
        projectId,
        messageId,
        url:
          recipient.recipientRole === "customer"
            ? `/customer/work/${projectId}`
            : `/contractor/work/${projectId}`,
        metadata: {
          file_id: fileId,
          file_name: fileValue.name,
          storage_path: storagePath,
          mime_type: fileValue.type,
          size_bytes: fileValue.size,
          file_category: fileCategory,
          sender_id: user.id,
        },
        deduplicationKey: `chat-file:${fileId}`,
      });
    }
  } catch (error) {
    console.error("Ошибка создания уведомления о файле:", error);
  }

  revalidateChatPages(projectId);
  return {
    success: true,
    message: "Файл отправлен",
    messageId,
    fileId,
  };
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

function getSafeFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  if (index < 0) return "";
  const extension = fileName.slice(index).toLowerCase();
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip"]);
  return allowed.has(extension) ? extension : "";
}

function getFileCategory(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") return "archive";
  return "document";
}

function getFileNotificationPreview(fileName: string, messageText: string) {
  const normalizedText = messageText.trim().replace(/\s+/g, " ");
  if (normalizedText === fileName) return fileName;
  const preview = `${normalizedText} — ${fileName}`;
  return preview.length <= 120 ? preview : `${preview.slice(0, 117)}...`;
}
