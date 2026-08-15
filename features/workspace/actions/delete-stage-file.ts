"use server";

import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { s3 } from "@/lib/storage/s3";

const PROJECT_FILES_BUCKET = "project-files";

export type DeleteStageFileResult = {
  success: boolean;
  message: string;
};

type FileRow = {
  id: string;
  uploaded_by: string;
  storage_path: string;
  stage_status: string;
};

export async function deleteStageFile(
  fileId: string,
  projectId: string
): Promise<DeleteStageFileResult> {
  const activeUser = await requireActiveUser();

  if (!activeUser.success) {
    return { success: false, message: activeUser.message };
  }

  if (activeUser.profile.role !== "contractor") {
    return {
      success: false,
      message: "Удалять файлы этапа может только подрядчик",
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
    [activeUser.user.id]
  );

  const company = companyResult.rows[0];

  if (
    !company ||
    activeProject.project.selected_contractor_id !== company.id
  ) {
    return {
      success: false,
      message: "Проект не найден или не назначен вашей компании",
    };
  }

  let file: FileRow | undefined;

  try {
    const result = await db.query<FileRow>(
      `
        SELECT
          f.id,
          f.uploaded_by,
          f.storage_path,
          s.status AS stage_status
        FROM public.project_stage_files f
        JOIN public.project_stages s
          ON s.id = f.stage_id
         AND s.project_id = f.project_id
        WHERE f.id = $1
          AND f.project_id = $2
          AND f.uploaded_by = $3
        LIMIT 1
      `,
      [fileId, projectId, activeUser.user.id]
    );

    file = result.rows[0];
  } catch (error) {
    console.error("Ошибка поиска файла этапа:", error);
    return { success: false, message: "Файл не найден или недоступен" };
  }

  if (!file) {
    return { success: false, message: "Файл не найден или недоступен" };
  }

  if (file.stage_status === "completed") {
    return { success: false, message: "Нельзя удалить файл принятого этапа" };
  }

  /*
   * Сначала удаляем запись из PostgreSQL.
   * Если S3 временно недоступен, максимум останется сиротский объект,
   * который можно безопасно удалить позже. Обратный порядок опаснее:
   * запись может остаться в БД и указывать на уже удалённый объект.
   */
  try {
    const result = await db.query<{ id: string }>(
      `
        DELETE FROM public.project_stage_files
        WHERE id = $1
          AND project_id = $2
          AND uploaded_by = $3
        RETURNING id
      `,
      [file.id, projectId, activeUser.user.id]
    );

    if (!result.rows[0]) {
      return { success: false, message: "Файл уже удалён или недоступен" };
    }
  } catch (error) {
    console.error("Ошибка удаления записи файла:", error);
    return { success: false, message: "Не удалось удалить файл" };
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: PROJECT_FILES_BUCKET,
        Key: file.storage_path,
      })
    );
  } catch (error) {
    console.error("Запись файла удалена, но объект S3 удалить не удалось:", {
      fileId: file.id,
      storagePath: file.storage_path,
      error,
    });
  }

  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath(`/customer/work/${projectId}`);

  return { success: true, message: "Файл удалён" };
}
