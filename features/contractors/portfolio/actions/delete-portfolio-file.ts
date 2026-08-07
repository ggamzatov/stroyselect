"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

export type DeletePortfolioFileResult = {
  success: boolean;
  message: string;
};

export async function deletePortfolioFile(
  fileId: string
): Promise<DeletePortfolioFileResult> {
  const supabase =
    await createClient();

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
      message: "Необходимо войти",
    };
  }

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

  /*
   * Загружаем файл вместе
   * с объектом портфолио.
   */
  const {
    data: file,
    error: fileError,
  } = await supabase
    .from(
      "contractor_portfolio_files"
    )
    .select(`
      id,
      portfolio_project_id,
      storage_bucket,
      storage_path,
      contractor_portfolio_projects!inner (
        contractor_id
      )
    `)
    .eq("id", fileId)
    .maybeSingle();

  if (
    fileError ||
    !file
  ) {
    console.error(
      "Ошибка загрузки фотографии:",
      fileError
    );

    return {
      success: false,
      message:
        "Фотография не найдена",
    };
  }

  const portfolioProject =
    getSingleRelation(
      file.contractor_portfolio_projects
    );

  if (
    !portfolioProject ||
    portfolioProject.contractor_id !==
      company.id
  ) {
    return {
      success: false,
      message:
        "Нет доступа к этой фотографии",
    };
  }

  /*
   * Сначала удаляем файл
   * из Storage.
   */
  const {
    error: storageError,
  } = await supabase.storage
    .from(
      file.storage_bucket
    )
    .remove([
      file.storage_path,
    ]);

  if (storageError) {
    console.error(
      "Ошибка удаления фотографии из Storage:",
      storageError
    );

    return {
      success: false,
      message:
        "Не удалось удалить файл",
    };
  }

  /*
   * Затем удаляем запись
   * из таблицы.
   */
  const {
    error: deleteError,
  } = await supabase
    .from(
      "contractor_portfolio_files"
    )
    .delete()
    .eq("id", file.id);

  if (deleteError) {
    console.error(
      "Ошибка удаления записи фотографии:",
      deleteError
    );

    return {
      success: false,
      message:
        "Файл удалён из хранилища, но не удалось удалить запись",
    };
  }

  revalidatePath(
    "/contractor/company"
  );

  return {
    success: true,
    message:
      "Фотография удалена",
  };
}

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}