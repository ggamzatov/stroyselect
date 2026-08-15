"use server";

import { revalidatePath } from "next/cache";

import { db } from
  "@/lib/db/pool";

import {
  requireActiveUser,
} from "@/lib/auth/require-active-user";

export type SetPortfolioCoverResult = {
  success: boolean;
  message: string;
};

type TargetFileRow = {
  id: string;
  portfolio_project_id: string;
};

type PortfolioFileIdRow = {
  id: string;
};

export async function setPortfolioCover(
  fileId: string
): Promise<SetPortfolioCoverResult> {
  /*
   * ========================================
   * 1. Проверяем пользователя
   * ========================================
   */

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

  if (!fileId) {
    return {
      success: false,
      message:
        "Фотография не указана",
    };
  }

  /*
   * ========================================
   * 2. Проверяем принадлежность фотографии
   * ========================================
   */

  let target:
    TargetFileRow |
    undefined;

  try {
    const result =
      await db.query<TargetFileRow>(
        `
          SELECT
            cpf.id,
            cpf.portfolio_project_id

          FROM
            public.contractor_portfolio_files
              cpf

          JOIN
            public.contractor_portfolio_projects
              cpp
            ON cpp.id =
              cpf.portfolio_project_id

          JOIN
            public.contractor_companies
              cc
            ON cc.id =
              cpp.contractor_id

          WHERE
            cpf.id = $1
            AND cc.owner_id = $2

          LIMIT 1
        `,
        [
          fileId,
          auth.user.id,
        ]
      );

    target =
      result.rows[0];
  } catch (error) {
    console.error(
      "Ошибка поиска фотографии для обложки:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось получить фотографию",
    };
  }

  if (!target) {
    return {
      success: false,
      message:
        "Фотография не найдена или у вас нет доступа",
    };
  }

  /*
   * ========================================
   * 3. Переставляем sort_order
   * ========================================
   *
   * Обложкой является первый файл.
   * Поэтому выбранный файл получает
   * sort_order = 0.
   */

  const client =
    await db.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const filesResult =
      await client.query<PortfolioFileIdRow>(
        `
          SELECT
            id

          FROM
            public.contractor_portfolio_files

          WHERE
            portfolio_project_id = $1

          ORDER BY
            sort_order ASC,
            created_at ASC,
            id ASC

          FOR UPDATE
        `,
        [
          target
            .portfolio_project_id,
        ]
      );

    /*
     * Выбранный файл ставим первым,
     * остальные сохраняем в прежнем
     * относительном порядке.
     */
    const orderedIds = [
      target.id,

      ...filesResult.rows
        .map(
          (file) =>
            file.id
        )
        .filter(
          (id) =>
            id !==
            target.id
        ),
    ];

    for (
      let index = 0;
      index <
      orderedIds.length;
      index += 1
    ) {
      await client.query(
        `
          UPDATE
            public.contractor_portfolio_files

          SET
            sort_order = $1

          WHERE
            id = $2
            AND portfolio_project_id = $3
        `,
        [
          index,
          orderedIds[index],
          target
            .portfolio_project_id,
        ]
      );
    }

    await client.query(
      "COMMIT"
    );
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Ошибка изменения обложки портфолио:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось установить обложку",
    };
  } finally {
    client.release();
  }

  /*
   * ========================================
   * 4. Обновляем страницы
   * ========================================
   */

  revalidatePath(
    "/contractor/company"
  );

  revalidatePath(
    "/contractor/dashboard"
  );

  return {
    success: true,
    message:
      "Обложка изменена",
  };
}