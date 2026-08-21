"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { s3 } from "@/lib/storage/s3";
import { validateUploadedFile } from "@/lib/storage/validate-upload";

import { stageFileMetadataSchema } from "@/features/workspace/schemas/stage-file-schema";
import { createNotification } from "@/features/notifications/server/create-notification";
import { getProjectNotificationRecipient } from "@/features/notifications/server/get-project-notification-recipient";

const PROJECT_FILES_BUCKET = "project-files";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type UploadStageFileResult = {
  success: boolean;
  message: string;
  fileId?: string;
};

type StageRow = {
  id: string;
  title: string;
  status: string;
};

export async function uploadStageFile(
  formData: FormData
): Promise<UploadStageFileResult> {
  const parsed = stageFileMetadataSchema.safeParse({
    projectId: formData.get("projectId"),
    stageId: formData.get("stageId"),
    fileCategory: formData.get("fileCategory"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Проверьте данные файла",
    };
  }

  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    return { success: false, message: "Выберите файл" };
  }

  const validation = await validateUploadedFile(fileValue, {
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (!validation.ok) {
    return { success: false, message: validation.message };
  }

  const { projectId, stageId, fileCategory, description } = parsed.data;
  const activeUser = await requireActiveUser();

  if (!activeUser.success) {
    return { success: false, message: activeUser.message };
  }

  const { user, profile } = activeUser;

  if (profile.role !== "contractor") {
    return {
      success: false,
      message: "Загружать файлы этапа может только подрядчик",
    };
  }

  const activeProject = await requireActiveProject(projectId);

  if (!activeProject.success) {
    return { success: false, message: activeProject.message };
  }

  const companyResult = await db.query<{ id: string }>(
    `
      SELECT id
      FROM public.contractor_companies
      WHERE owner_id = $1
      LIMIT 1
    `,
    [user.id]
  );

  const company = companyResult.rows[0];

  if (!company) {
    return { success: false, message: "Компания подрядчика не найдена" };
  }

  if (activeProject.project.selected_contractor_id !== company.id) {
    return {
      success: false,
      message: "Проект не найден или не назначен вашей компании",
    };
  }

  const stageResult = await db.query<StageRow>(
    `
      SELECT id, title, status
      FROM public.project_stages
      WHERE id = $1
        AND project_id = $2
      LIMIT 1
    `,
    [stageId, projectId]
  );

  const stage = stageResult.rows[0];

  if (!stage) {
    return { success: false, message: "Этап не найден" };
  }

  if (stage.status === "completed") {
    return { success: false, message: "В принятый этап нельзя добавлять файлы" };
  }

  const fileExtension = getSafeFileExtension(fileValue.name);
  const storagePath = `${projectId}/${stageId}/${crypto.randomUUID()}${fileExtension}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: PROJECT_FILES_BUCKET,
        Key: storagePath,
        Body: validation.buffer,
        ContentType: fileValue.type,
        CacheControl: "private, max-age=0, no-store",
      })
    );
  } catch (error) {
    console.error("Ошибка загрузки файла в S3:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Не удалось загрузить файл",
    };
  }

  let createdFileId: string;

  try {
    const result = await db.query<{ id: string }>(
      `
        INSERT INTO public.project_stage_files (
          project_id,
          stage_id,
          uploaded_by,
          file_name,
          storage_path,
          file_size,
          mime_type,
          file_category,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        projectId,
        stageId,
        user.id,
        fileValue.name,
        storagePath,
        fileValue.size,
        fileValue.type,
        fileCategory,
        description?.trim() || null,
      ]
    );

    const createdFile = result.rows[0];

    if (!createdFile) {
      throw new Error("Запись файла не создана");
    }

    createdFileId = createdFile.id;
  } catch (error) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: PROJECT_FILES_BUCKET,
          Key: storagePath,
        })
      );
    } catch (cleanupError) {
      console.error("Ошибка компенсационного удаления файла из S3:", cleanupError);
    }

    console.error("Ошибка сохранения сведений о файле:", error);
    return { success: false, message: "Не удалось сохранить сведения о файле" };
  }

  const isImage = fileValue.type.startsWith("image/");

  try {
    await db.query(
      `
        INSERT INTO public.project_events (
          project_id,
          author_id,
          event_type,
          title,
          description,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        projectId,
        user.id,
        isImage ? "photo_uploaded" : "document_uploaded",
        isImage ? "Добавлена фотография этапа" : "Добавлен документ этапа",
        `${stage.title}: ${fileValue.name}`,
        JSON.stringify({
          stage_id: stageId,
          file_id: createdFileId,
          file_category: fileCategory,
        }),
      ]
    );
  } catch (error) {
    console.error("Ошибка создания события файла этапа:", error);
  }

  try {
    const recipient = await getProjectNotificationRecipient(projectId, user.id);

    if (recipient) {
      await createNotification({
        userId: recipient.recipientUserId,
        actorId: user.id,
        notificationType: "file_uploaded",
        title: isImage ? "Добавлена фотография" : "Добавлен документ",
        body: `Подрядчик добавил файл «${fileValue.name}» к этапу «${stage.title}».`,
        projectId,
        url:
          recipient.recipientRole === "customer"
            ? `/customer/work/${projectId}`
            : `/contractor/work/${projectId}`,
        metadata: {
          stage_id: stageId,
          file_id: createdFileId,
          file_name: fileValue.name,
        },
      });
    }
  } catch (error) {
    console.error("Ошибка уведомления о файле этапа:", error);
  }

  revalidateWorkspace(projectId);

  return { success: true, message: "Файл загружен", fileId: createdFileId };
}

function getSafeFileExtension(fileName: string) {
  const extensionIndex = fileName.lastIndexOf(".");
  if (extensionIndex < 0) return "";

  const extension = fileName.slice(extensionIndex).toLowerCase();
  const allowedExtensions = new Set([
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

  return allowedExtensions.has(extension) ? extension : "";
}

function revalidateWorkspace(projectId: string) {
  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath(`/customer/work/${projectId}`);
  revalidatePath("/customer", "layout");
}
