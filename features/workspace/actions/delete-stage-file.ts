"use server";

import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
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

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: PROJECT_FILES_BUCKET,
        Key: file.storage_path,
      })
    );
  } catch (error) {
    console.error("Ошибка удаления файла из S3:", error);
    return {
      success: false,
      message: "Не удалось удалить файл из хранилища",
    };
  }

  try {
    const result = await db.query<{ id: string }>(
      `
        DELETE FROM public.project_stage_files
        WHERE id = $1
          AND uploaded_by = $2
        RETURNING id
      `,
      [file.id, activeUser.user.id]
    );

    if (!result.rows[0]) {
      throw new Error("Запись файла не удалена");
    }
  } catch (error) {
    console.error("Ошибка удаления записи файла:", error);
    return {
      success: false,
      message: "Файл удалён из хранилища, но не удалось удалить запись",
    };
  }

  revalidatePath(`/contractor/work/${projectId}`);
  revalidatePath(`/customer/work/${projectId}`);

  return { success: true, message: "Файл удалён" };
}
