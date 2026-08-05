"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

export type DeleteStageFileResult = {
  success: boolean;
  message: string;
};

export async function deleteStageFile(
  fileId: string,
  projectId: string
): Promise<DeleteStageFileResult> {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const {
    data: file,
    error: fileError,
  } = await supabase
    .from("project_stage_files")
    .select(`
      id,
      project_id,
      stage_id,
      uploaded_by,
      storage_path,
      project_stages!inner (
        status
      )
    `)
    .eq("id", fileId)
    .eq("project_id", projectId)
    .eq("uploaded_by", user.id)
    .maybeSingle();

  if (
    fileError ||
    !file
  ) {
    return {
      success: false,
      message:
        "Файл не найден или недоступен",
    };
  }

  const relation =
    Array.isArray(
      file.project_stages
    )
      ? file.project_stages[0]
      : file.project_stages;

  if (
    relation?.status ===
    "completed"
  ) {
    return {
      success: false,
      message:
        "Нельзя удалить файл принятого этапа",
    };
  }

  const {
    error: storageError,
  } = await supabase.storage
    .from("project-files")
    .remove([
      file.storage_path,
    ]);

  if (storageError) {
    console.error(
      "Ошибка удаления из Storage:",
      storageError
    );

    return {
      success: false,
      message:
        "Не удалось удалить файл из хранилища",
    };
  }

  const {
    error: deleteError,
  } = await supabase
    .from("project_stage_files")
    .delete()
    .eq("id", file.id)
    .eq(
      "uploaded_by",
      user.id
    );

  if (deleteError) {
    console.error(
      "Ошибка удаления записи:",
      deleteError
    );

    return {
      success: false,
      message:
        "Файл удалён из хранилища, но не удалось удалить запись",
    };
  }

  revalidatePath(
    `/contractor/work/${projectId}`
  );

  revalidatePath(
    `/customer/work/${projectId}`
  );

  return {
    success: true,
    message: "Файл удалён",
  };
}