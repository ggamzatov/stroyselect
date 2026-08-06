"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import { chatAttachmentSchema } from
  "@/features/chat/schemas/chat-attachment-schema";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

export type SendChatAttachmentResult = {
  success: boolean;
  message: string;
  messageId?: string;
  fileId?: string;
};

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
  new Set([
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
  /*
   * Проверяем идентификатор проекта
   * и необязательный текст сообщения.
   */
  const parsed =
    chatAttachmentSchema.safeParse({
      projectId:
        formData.get("projectId"),

      messageText:
        formData.get("messageText") ??
        "",
    });

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте данные",
    };
  }

  /*
   * Получаем файл из FormData.
   */
  const fileValue =
    formData.get("file");

  if (!(fileValue instanceof File)) {
    return {
      success: false,
      message: "Выберите файл",
    };
  }

  if (fileValue.size <= 0) {
    return {
      success: false,
      message: "Файл пустой",
    };
  }

  if (
    fileValue.size >
    MAX_FILE_SIZE
  ) {
    return {
      success: false,
      message:
        "Размер файла не должен превышать 20 МБ",
    };
  }

  if (
    !ALLOWED_MIME_TYPES.has(
      fileValue.type
    )
  ) {
    return {
      success: false,
      message:
        "Этот формат файла не поддерживается",
    };
  }

  const supabase =
    await createClient();

  /*
   * Проверяем авторизацию.
   */
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const {
    projectId,
    messageText,
  } = parsed.data;

  /*
   * Загружаем проект и проверяем,
   * имеет ли пользователь доступ к чату.
   */
  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      customer_id,
      selected_contractor_id,
      status
    `)
    .eq("id", projectId)
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка проверки проекта перед загрузкой файла:",
      projectError
    );

    return {
      success: false,
      message:
        "Проект не найден или недоступен",
    };
  }

  let hasAccess =
    project.customer_id ===
    user.id;

  /*
   * Если пользователь не заказчик,
   * проверяем, является ли он владельцем
   * выбранной компании подрядчика.
   */
  if (
    !hasAccess &&
    project.selected_contractor_id
  ) {
    const {
      data: contractorCompany,
      error: companyError,
    } = await supabase
      .from("contractor_companies")
      .select(`
        id,
        owner_id
      `)
      .eq(
        "id",
        project.selected_contractor_id
      )
      .maybeSingle();

    if (companyError) {
      console.error(
        "Ошибка проверки подрядчика перед загрузкой файла:",
        companyError
      );
    }

    hasAccess =
      contractorCompany
        ?.owner_id === user.id;
  }

  if (!hasAccess) {
    return {
      success: false,
      message:
        "У вас нет доступа к чату этого проекта",
    };
  }

  /*
   * Разрешаем отправлять файлы только
   * после выбора подрядчика.
   */
  const allowedProjectStatuses =
    new Set([
      "contractor_selected",
      "in_progress",
      "completed",
      "disputed",
    ]);

  if (
    !allowedProjectStatuses.has(
      project.status
    )
  ) {
    return {
      success: false,
      message:
        "Чат пока недоступен для этого проекта",
    };
  }

  /*
   * Если пользователь не написал текст,
   * используем имя файла.
   *
   * Это необходимо, потому что поле
   * message_text в базе не должно быть пустым.
   */
  const normalizedText =
    messageText?.trim() ||
    fileValue.name;

  /*
   * Сначала создаём сообщение.
   */
  const {
    data: createdMessage,
    error: messageError,
  } = await supabase
    .from("project_messages")
    .insert({
      project_id:
        projectId,

      sender_id:
        user.id,

      message_text:
        normalizedText,

      reply_to_id:
        null,

      edited_at:
        null,

      is_deleted:
        false,

      deleted_at:
        null,

      deleted_by:
        null,
    })
    .select(`
      id,
      project_id,
      sender_id,
      message_text,
      created_at
    `)
    .single();

  if (
    messageError ||
    !createdMessage
  ) {
    console.error(
      "Ошибка создания сообщения с файлом:",
      messageError
    );

    return {
      success: false,
      message:
        messageError?.message ??
        "Не удалось создать сообщение",
    };
  }

  /*
   * Формируем безопасный путь:
   *
   * projectId/messageId/randomUuid.ext
   */
  const extension =
    getSafeFileExtension(
      fileValue.name
    );

  const storagePath =
    `${projectId}/` +
    `${createdMessage.id}/` +
    `${crypto.randomUUID()}${extension}`;

  /*
   * Преобразуем File в ArrayBuffer
   * для загрузки в Supabase Storage.
   */
  const arrayBuffer =
    await fileValue.arrayBuffer();

  const {
    error: uploadError,
  } = await supabase.storage
    .from("chat-files")
    .upload(
      storagePath,
      arrayBuffer,
      {
        contentType:
          fileValue.type,

        cacheControl:
          "3600",

        upsert:
          false,
      }
    );

  if (uploadError) {
    console.error(
      "Ошибка загрузки файла чата:",
      uploadError
    );

    /*
     * Если файл не загрузился,
     * удаляем созданное сообщение.
     */
    await supabase
      .from("project_messages")
      .delete()
      .eq(
        "id",
        createdMessage.id
      )
      .eq(
        "sender_id",
        user.id
      );

    return {
      success: false,
      message:
        uploadError.message ||
        "Не удалось загрузить файл",
    };
  }

  const fileCategory =
    getFileCategory(
      fileValue.type
    );

  /*
   * Записываем информацию о файле
   * в project_message_files.
   */
  const {
    data: createdFile,
    error: fileInsertError,
  } = await supabase
    .from("project_message_files")
    .insert({
      project_id:
        projectId,

      message_id:
        createdMessage.id,

      uploaded_by:
        user.id,

      storage_bucket:
        "chat-files",

      storage_path:
        storagePath,

      original_name:
        fileValue.name,

      mime_type:
        fileValue.type,

      size_bytes:
        fileValue.size,

      file_category:
        fileCategory,
    })
    .select(`
      id,
      original_name,
      storage_path
    `)
    .single();

  if (
    fileInsertError ||
    !createdFile
  ) {
    console.error(
      "Ошибка записи вложения:",
      fileInsertError
    );

    /*
     * Если запись о файле не создалась,
     * удаляем сам файл из Storage.
     */
    await supabase.storage
      .from("chat-files")
      .remove([
        storagePath,
      ]);

    /*
     * Также удаляем сообщение.
     */
    await supabase
      .from("project_messages")
      .delete()
      .eq(
        "id",
        createdMessage.id
      )
      .eq(
        "sender_id",
        user.id
      );

    return {
      success: false,
      message:
        fileInsertError?.message ??
        "Не удалось сохранить вложение",
    };
  }

  /*
   * Создаём уведомление второму
   * участнику проекта.
   *
   * Ошибка уведомления не должна
   * отменять уже загруженный файл.
   */
  try {
    const recipient =
      await getProjectNotificationRecipient(
        projectId,
        user.id
      );

    if (recipient) {
      const notificationUrl =
        recipient.recipientRole ===
          "customer"
          ? `/customer/work/${projectId}`
          : `/contractor/work/${projectId}`;

      const notificationResult =
        await createNotification({
          userId:
            recipient.recipientUserId,

          actorId:
            user.id,

          notificationType:
            "file_uploaded",

          title:
            "Получен файл",

          body:
            getFileNotificationPreview(
              fileValue.name,
              normalizedText
            ),

          projectId,

          messageId:
            createdMessage.id,

          url:
            notificationUrl,

          metadata: {
            file_id:
              createdFile.id,

            file_name:
              fileValue.name,

            storage_path:
              storagePath,

            mime_type:
              fileValue.type,

            size_bytes:
              fileValue.size,

            file_category:
              fileCategory,

            sender_id:
              user.id,
          },
        });

      if (
        !notificationResult.success
      ) {
        console.error(
          "Не удалось создать уведомление о файле:",
          notificationResult.message
        );
      }
    }
  } catch (
    notificationError
  ) {
    console.error(
      "Непредвиденная ошибка создания уведомления о файле:",
      notificationError
    );
  }

  revalidateChatPages(
    projectId
  );

  return {
    success: true,
    message:
      "Файл отправлен",

    messageId:
      createdMessage.id,

    fileId:
      createdFile.id,
  };
}

function revalidateChatPages(
  projectId: string
) {
  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/contractor/work/${projectId}`
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    "/customer/dashboard"
  );

  revalidatePath(
    "/contractor/dashboard"
  );
}

function getSafeFileExtension(
  fileName: string
) {
  const index =
    fileName.lastIndexOf(".");

  if (index < 0) {
    return "";
  }

  const extension =
    fileName
      .slice(index)
      .toLowerCase();

  const allowedExtensions =
    new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",

      ".pdf",

      ".doc",
      ".docx",

      ".xls",
      ".xlsx",

      ".zip",
    ]);

  return allowedExtensions.has(
    extension
  )
    ? extension
    : "";
}

function getFileCategory(
  mimeType: string
) {
  if (
    mimeType.startsWith(
      "image/"
    )
  ) {
    return "image";
  }

  if (
    mimeType ===
      "application/zip" ||
    mimeType ===
      "application/x-zip-compressed"
  ) {
    return "archive";
  }

  return "document";
}

function getFileNotificationPreview(
  fileName: string,
  messageText: string
) {
  const normalizedText =
    messageText
      .trim()
      .replace(/\s+/g, " ");

  /*
   * Если текст совпадает с именем файла,
   * показываем только имя.
   */
  if (
    normalizedText === fileName
  ) {
    return fileName;
  }

  const preview =
    `${normalizedText} — ${fileName}`;

  if (
    preview.length <= 120
  ) {
    return preview;
  }

  return `${preview.slice(
    0,
    117
  )}...`;
}