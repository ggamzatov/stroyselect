"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import {
  stageFileMetadataSchema,
} from
  "@/features/workspace/schemas/stage-file-schema";

import { createNotification } from
  "@/features/notifications/server/create-notification";

import { getProjectNotificationRecipient } from
  "@/features/notifications/server/get-project-notification-recipient";

export type UploadStageFileResult = {
  success: boolean;
  message: string;
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
  ]);

export async function uploadStageFile(
  formData: FormData
): Promise<UploadStageFileResult> {
  /*
   * Проверяем метаданные.
   */
  const parsed =
    stageFileMetadataSchema.safeParse({
      projectId:
        formData.get("projectId"),

      stageId:
        formData.get("stageId"),

      fileCategory:
        formData.get(
          "fileCategory"
        ),

      description:
        formData.get(
          "description"
        ) ?? "",
    });

  if (!parsed.success) {
    return {
      success: false,

      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте данные файла",
    };
  }

  /*
   * Получаем сам файл.
   */
  const fileValue =
    formData.get("file");

  if (
    !(fileValue instanceof File)
  ) {
    return {
      success: false,
      message:
        "Выберите файл",
    };
  }

  if (
    fileValue.size === 0
  ) {
    return {
      success: false,
      message:
        "Файл пустой",
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

  /*
   * Supabase.
   */
  const supabase =
    await createClient();

  /*
   * Авторизация.
   */
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      success: false,
      message:
        "Необходимо войти",
    };
  }

  const {
    projectId,
    stageId,
    fileCategory,
    description,
  } = parsed.data;

  /*
   * Проверяем компанию подрядчика.
   */
  const {
    data: company,
    error: companyError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select(`
      id,
      public_name
    `)
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    return {
      success: false,

      message:
        "Компания подрядчика не найдена",
    };
  }

  /*
   * Проверяем, что проект
   * назначен этой компании.
   */
  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      status,
      selected_contractor_id
    `)
    .eq(
      "id",
      projectId
    )
    .eq(
      "selected_contractor_id",
      company.id
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Ошибка проверки проекта перед загрузкой файла:",
      {
        message:
          projectError?.message,

        details:
          projectError?.details,

        hint:
          projectError?.hint,

        code:
          projectError?.code,
      }
    );

    return {
      success: false,

      message:
        "Проект не найден или не назначен вашей компании",
    };
  }

  /*
   * Проверяем этап.
   */
  const {
    data: stage,
    error: stageError,
  } = await supabase
    .from("project_stages")
    .select(`
      id,
      title,
      status
    `)
    .eq(
      "id",
      stageId
    )
    .eq(
      "project_id",
      projectId
    )
    .maybeSingle();

  if (
    stageError ||
    !stage
  ) {
    console.error(
      "Ошибка проверки этапа перед загрузкой файла:",
      {
        message:
          stageError?.message,

        details:
          stageError?.details,

        hint:
          stageError?.hint,

        code:
          stageError?.code,
      }
    );

    return {
      success: false,
      message:
        "Этап не найден",
    };
  }

  /*
   * После принятия этапа
   * изменения блокируем.
   */
  if (
    stage.status ===
    "completed"
  ) {
    return {
      success: false,

      message:
        "В принятый этап нельзя добавлять файлы",
    };
  }

  /*
   * Формируем безопасное расширение.
   */
  const fileExtension =
    getSafeFileExtension(
      fileValue.name
    );

  /*
   * projectId/stageId/random.ext
   */
  const storagePath =
    `${projectId}/${stageId}/` +
    `${crypto.randomUUID()}${fileExtension}`;

  /*
   * Загружаем файл в Storage.
   */
  const arrayBuffer =
    await fileValue.arrayBuffer();

  const {
    error: uploadError,
  } = await supabase.storage
    .from(
      "project-files"
    )
    .upload(
      storagePath,
      arrayBuffer,
      {
        contentType:
          fileValue.type,

        upsert:
          false,

        cacheControl:
          "3600",
      }
    );

  if (uploadError) {
    console.error(
      "Ошибка загрузки в Storage:",
      {
        message:
          uploadError.message,
      }
    );

    return {
      success: false,

      message:
        uploadError.message ||
        "Не удалось загрузить файл",
    };
  }

  /*
   * Сохраняем информацию
   * о файле в базе.
   */
  const {
    data: createdFile,
    error: insertError,
  } = await supabase
    .from(
      "project_stage_files"
    )
    .insert({
      project_id:
        projectId,

      stage_id:
        stageId,

      uploaded_by:
        user.id,

      file_name:
        fileValue.name,

      storage_path:
        storagePath,

      file_size:
        fileValue.size,

      mime_type:
        fileValue.type,

      file_category:
        fileCategory,

      description:
        description?.trim() ||
        null,
    })
    .select(`
      id
    `)
    .single();

  if (
    insertError ||
    !createdFile
  ) {
    console.error(
      "Ошибка сохранения файла:",
      {
        message:
          insertError?.message,

        details:
          insertError?.details,

        hint:
          insertError?.hint,

        code:
          insertError?.code,
      }
    );

    /*
     * Запись в БД не создалась —
     * удаляем файл из Storage.
     */
    await supabase.storage
      .from(
        "project-files"
      )
      .remove([
        storagePath,
      ]);

    return {
      success: false,

      message:
        "Не удалось сохранить сведения о файле",
    };
  }

  /*
   * Определяем тип материала.
   */
  const isImage =
    fileValue.type.startsWith(
      "image/"
    );

  const eventTitle =
    isImage
      ? "Добавлена фотография этапа"
      : "Добавлен документ этапа";

  /*
   * Создаём запись
   * в истории проекта.
   */
  const {
    error: eventError,
  } = await supabase
    .from(
      "project_events"
    )
    .insert({
      project_id:
        projectId,

      author_id:
        user.id,

      event_type:
        isImage
          ? "photo_uploaded"
          : "document_uploaded",

      title:
        eventTitle,

      description:
        `${stage.title}: ${fileValue.name}`,

      metadata: {
        stage_id:
          stageId,

        file_id:
          createdFile.id,

        file_category:
          fileCategory,
      },
    });

  if (eventError) {
    console.error(
      "Ошибка создания события:",
      {
        message:
          eventError.message,

        details:
          eventError.details,

        hint:
          eventError.hint,

        code:
          eventError.code,
      }
    );
  }

  /*
   * Создаём уведомление заказчику.
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

      const notificationTitle =
        isImage
          ? "Добавлена фотография этапа"
          : "Добавлен документ этапа";

      const notificationBody =
        getFileNotificationBody({
          stageTitle:
            stage.title,

          fileName:
            fileValue.name,

          description:
            description?.trim() ||
            null,

          isImage,
        });

      const notificationResult =
        await createNotification({
          userId:
            recipient.recipientUserId,

          actorId:
            user.id,

          notificationType:
            "file_uploaded",

          title:
            notificationTitle,

          body:
            notificationBody,

          projectId,

          url:
            notificationUrl,

          metadata: {
            stage_id:
              stage.id,

            stage_title:
              stage.title,

            file_id:
              createdFile.id,

            file_name:
              fileValue.name,

            file_category:
              fileCategory,

            mime_type:
              fileValue.type,

            size_bytes:
              fileValue.size,

            storage_path:
              storagePath,

            uploader_id:
              user.id,
          },
        });

      if (
        !notificationResult.success
      ) {
        console.error(
          "Не удалось создать уведомление о файле этапа:",
          notificationResult.message
        );
      }
    }
  } catch (
    notificationError
  ) {
    console.error(
      "Непредвиденная ошибка создания уведомления о файле этапа:",
      notificationError
    );
  }

  /*
   * Обновляем страницы.
   */
  revalidateWorkspace(
    projectId
  );

  return {
    success: true,

    message:
      isImage
        ? "Фотография загружена"
        : "Файл загружен",

    fileId:
      createdFile.id,
  };
}

function getSafeFileExtension(
  fileName: string
) {
  const extensionIndex =
    fileName.lastIndexOf(
      "."
    );

  if (
    extensionIndex < 0
  ) {
    return "";
  }

  const extension =
    fileName
      .slice(
        extensionIndex
      )
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
    ]);

  return allowedExtensions.has(
    extension
  )
    ? extension
    : "";
}

function getFileNotificationBody({
  stageTitle,
  fileName,
  description,
  isImage,
}: {
  stageTitle: string;
  fileName: string;
  description:
    string | null;
  isImage: boolean;
}) {
  const materialLabel =
    isImage
      ? "Фотография"
      : "Документ";

  let text =
    `${materialLabel} «${fileName}» добавлен к этапу «${stageTitle}».`;

  if (description) {
    const normalizedDescription =
      description
        .trim()
        .replace(
          /\s+/g,
          " "
        );

    text +=
      ` ${normalizedDescription}`;
  }

  if (
    text.length <= 180
  ) {
    return text;
  }

  return `${text.slice(
    0,
    177
  )}...`;
}

function revalidateWorkspace(
  projectId: string
) {
  revalidatePath(
    `/contractor/work/${projectId}`
  );

  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/customer/projects/${projectId}`
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  revalidatePath(
    "/customer/dashboard"
  );

  /*
   * В layout находится колокольчик,
   * поэтому обновляем и его данные.
   */
  revalidatePath(
    "/customer",
    "layout"
  );

  revalidatePath(
    "/contractor",
    "layout"
  );
}