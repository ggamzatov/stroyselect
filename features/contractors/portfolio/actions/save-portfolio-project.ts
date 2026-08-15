"use server";

import { revalidatePath } from "next/cache";

import { db } from
  "@/lib/db/pool";

import {
  requireActiveUser,
} from "@/lib/auth/require-active-user";

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

  const auth =
    await requireActiveUser();

  if (!auth.success) {
    return {
      success: false,
      message: auth.message,
    };
  }

  if (
    auth.profile.role !==
    "contractor"
  ) {
    return {
      success: false,
      message:
        "Доступно только подрядчику",
    };
  }

  const values =
    parsed.data;

  const companyResult =
    await db.query<{
      id: string;
    }>(
      `
        SELECT id
        FROM public.contractor_companies
        WHERE owner_id = $1
        LIMIT 1
      `,
      [auth.user.id]
    );

  const company =
    companyResult.rows[0];

  if (!company) {
    return {
      success: false,
      message:
        "Компания подрядчика не найдена",
    };
  }

  try {
    if (
      values.portfolioProjectId
    ) {
      const result =
        await db.query<{
          id: string;
        }>(
          `
            UPDATE
              public.contractor_portfolio_projects
            SET
              title = $1,
              description = $2,
              city = $3,
              completed_year = $4,
              updated_at = now()
            WHERE
              id = $5
              AND contractor_id = $6
            RETURNING id
          `,
          [
            values.title,
            values.description
              ?.trim() ||
              null,
            values.city
              ?.trim() ||
              null,
            values.completedYear ??
              null,
            values.portfolioProjectId,
            company.id,
          ]
        );

      const updated =
        result.rows[0];

      if (!updated) {
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
          updated.id,
      };
    }

    const result =
      await db.query<{
        id: string;
      }>(
        `
          INSERT INTO
            public.contractor_portfolio_projects (
              contractor_id,
              title,
              description,
              city,
              completed_year
            )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          RETURNING id
        `,
        [
          company.id,
          values.title,
          values.description
            ?.trim() ||
            null,
          values.city
            ?.trim() ||
            null,
          values.completedYear ??
            null,
        ]
      );

    const created =
      result.rows[0];

    if (!created) {
      throw new Error(
        "Проект портфолио не создан"
      );
    }

    revalidatePortfolio();

    return {
      success: true,
      message:
        "Объект портфолио добавлен",
      portfolioProjectId:
        created.id,
    };
  } catch (error) {
    console.error(
      "Ошибка сохранения объекта портфолио:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось сохранить объект портфолио",
    };
  }
}

function revalidatePortfolio() {
  revalidatePath(
    "/contractor/company"
  );

  revalidatePath(
    "/contractor/dashboard"
  );
}