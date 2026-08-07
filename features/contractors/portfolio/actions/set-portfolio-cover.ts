"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

export type SetPortfolioCoverResult = {
  success: boolean;
  message: string;
};

export async function setPortfolioCover(
  fileId: string
): Promise<SetPortfolioCoverResult> {
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
      message:
        "Необходимо войти",
    };
  }

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select("id")
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
        "Нет доступа к объекту портфолио",
    };
  }

  const {
    data: projectFiles,
    error: projectFilesError,
  } = await supabase
    .from(
      "contractor_portfolio_files"
    )
    .select(`
      id,
      sort_order
    `)
    .eq(
      "portfolio_project_id",
      file.portfolio_project_id
    )
    .order(
      "sort_order",
      {
        ascending: true,
      }
    );

  if (projectFilesError) {
    console.error(
      "Ошибка загрузки фотографий портфолио:",
      projectFilesError
    );

    return {
      success: false,
      message:
        "Не удалось изменить обложку",
    };
  }

  const files =
    projectFiles ?? [];

  /*
   * Выбранному изображению
   * назначаем sort_order = 0.
   *
   * Остальные располагаем
   * начиная с 1.
   */
  const orderedFiles = [
    file.id,
    ...files
      .filter(
        (item) =>
          item.id !==
          file.id
      )
      .map(
        (item) =>
          item.id
      ),
  ];

  for (
    let index = 0;
    index <
    orderedFiles.length;
    index += 1
  ) {
    const {
      error,
    } = await supabase
      .from(
        "contractor_portfolio_files"
      )
      .update({
        sort_order: index,
      })
      .eq(
        "id",
        orderedFiles[index]
      );

    if (error) {
      console.error(
        "Ошибка изменения порядка фотографий:",
        error
      );

      return {
        success: false,
        message:
          "Не удалось установить обложку",
      };
    }
  }

  revalidatePath(
    "/contractor/company"
  );

  return {
    success: true,
    message:
      "Обложка изменена",
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