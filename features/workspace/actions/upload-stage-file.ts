"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import {
  stageFileMetadataSchema,
} from
  "@/features/workspace/schemas/stage-file-schema";

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
  const parsed =
    stageFileMetadataSchema.safeParse({
      projectId:
        formData.get("projectId"),

      stageId:
        formData.get("stageId"),

      fileCategory:
        formData.get("fileCategory"),

      description:
        formData.get("description") ??
        "",
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

  const fileValue =
    formData.get("file");

  if (
    !(fileValue instanceof File)
  ) {
    return {
      success: false,
      message: "Выберите файл",
    };
  }

  if (fileValue.size === 0) {
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
    stageId,
    fileCategory,
    description,
  } = parsed.data;

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from("contractor_companies")
    .select("id")
    .eq("owner_id", user.id)
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

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      status,
      selected_contractor_id
    `)
    .eq("id", projectId)
    .eq(
      "selected_contractor_id",
      company.id
    )
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    return {
      success: false,
      message:
        "Проект не найден или не назначен вашей компании",
    };
  }

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
    .eq("id", stageId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (
    stageError ||
    !stage
  ) {
    return {
      success: false,
      message: "Этап не найден",
    };
  }

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

  const safeFileName =
    sanitizeFileName(
      fileValue.name
    );

  const storagePath =
    `${projectId}/${stageId}/` +
    `${crypto.randomUUID()}-${safeFileName}`;

  const arrayBuffer =
    await fileValue.arrayBuffer();

  const {
    error: uploadError,
  } = await supabase.storage
    .from("project-files")
    .upload(
      storagePath,
      arrayBuffer,
      {
        contentType:
          fileValue.type,

        upsert: false,

        cacheControl: "3600",
      }
    );

  if (uploadError) {
    console.error(
      "Ошибка загрузки в Storage:",
      uploadError
    );

    return {
      success: false,
      message:
        uploadError.message ||
        "Не удалось загрузить файл",
    };
  }

  const {
    data: createdFile,
    error: insertError,
  } = await supabase
    .from("project_stage_files")
    .insert({
      project_id: projectId,
      stage_id: stageId,
      uploaded_by: user.id,

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
    .select("id")
    .single();

  if (
    insertError ||
    !createdFile
  ) {
    console.error(
      "Ошибка сохранения файла:",
      insertError
    );

    await supabase.storage
      .from("project-files")
      .remove([storagePath]);

    return {
      success: false,
      message:
        "Не удалось сохранить сведения о файле",
    };
  }

  const eventTitle =
    fileValue.type.startsWith(
      "image/"
    )
      ? "Добавлена фотография этапа"
      : "Добавлен документ этапа";

  const { error: eventError } =
    await supabase
      .from("project_events")
      .insert({
        project_id:
          projectId,

        author_id:
          user.id,

        event_type:
          fileValue.type.startsWith(
            "image/"
          )
            ? "photo_uploaded"
            : "document_uploaded",

        title: eventTitle,

        description:
          `${stage.title}: ${fileValue.name}`,

        metadata: {
          stage_id: stageId,
          file_id:
            createdFile.id,

          file_category:
            fileCategory,
        },
      });

  if (eventError) {
    console.error(
      "Ошибка создания события:",
      eventError
    );
  }

  revalidateWorkspace(
    projectId
  );

  return {
    success: true,
    message: "Файл загружен",
    fileId: createdFile.id,
  };
}

function sanitizeFileName(
  value: string
) {
  const extensionIndex =
    value.lastIndexOf(".");

  const rawName =
    extensionIndex >= 0
      ? value.slice(
          0,
          extensionIndex
        )
      : value;

  const extension =
    extensionIndex >= 0
      ? value
          .slice(extensionIndex)
          .toLowerCase()
      : "";

  const safeName = rawName
    .normalize("NFKD")
    .replace(
      /[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g,
      "-"
    )
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

  return `${
    safeName || "file"
  }${extension}`;
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
}