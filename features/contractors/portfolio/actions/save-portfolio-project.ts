"use server";

import {
  revalidatePath,
} from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import {
  portfolioProjectSchema,
  type PortfolioProjectInput,
} from
  "@/features/contractors/portfolio/schemas/portfolio-project-schema";

export type SavePortfolioProjectResult = {
  success: boolean;
  message: string;
  portfolioProjectId?: string;
};

export async function savePortfolioProject(
  input: PortfolioProjectInput
): Promise<SavePortfolioProjectResult> {
  const parsed =
    portfolioProjectSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте данные объекта",
    };
  }

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

  const values =
    parsed.data;

  const {
    data: company,
    error:
      companyError,
  } = await supabase
    .from(
      "contractor_companies"
    )
    .select(
      "id"
    )
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

  const payload = {
    title:
      values.title,

    description:
      values.description
        ?.trim() ||
      null,

    city:
      values.city
        ?.trim() ||
      null,

    completed_year:
      values.completedYear ??
      null,

    updated_at:
      new Date().toISOString(),
  };

  if (
    values.portfolioProjectId
  ) {
    const {
      data:
        updatedProject,
      error,
    } = await supabase
      .from(
        "contractor_portfolio_projects"
      )
      .update(
        payload
      )
      .eq(
        "id",
        values.portfolioProjectId
      )
      .eq(
        "contractor_id",
        company.id
      )
      .select(
        "id"
      )
      .maybeSingle();

    if (
      error ||
      !updatedProject
    ) {
      console.error(
        "Ошибка обновления объекта портфолио:",
        error
      );

      return {
        success: false,
        message:
          "Не удалось обновить объект портфолио",
      };
    }

    revalidatePortfolio();

    return {
      success: true,
      message:
        "Объект портфолио обновлён",
      portfolioProjectId:
        updatedProject.id,
    };
  }

  const {
    data:
      createdProject,
    error,
  } = await supabase
    .from(
      "contractor_portfolio_projects"
    )
    .insert({
      contractor_id:
        company.id,

      ...payload,
    })
    .select(
      "id"
    )
    .single();

  if (
    error ||
    !createdProject
  ) {
    console.error(
      "Ошибка создания объекта портфолио:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось создать объект портфолио",
    };
  }

  revalidatePortfolio();

  return {
    success: true,
    message:
      "Объект портфолио добавлен",
    portfolioProjectId:
      createdProject.id,
  };
}

function revalidatePortfolio() {
  revalidatePath(
    "/contractor/company"
  );

  revalidatePath(
    "/contractor/dashboard"
  );
}