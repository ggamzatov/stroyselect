import "server-only";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

import {
  getSignedFileUrl,
} from
  "@/lib/storage/get-signed-file-url";

const PORTFOLIO_BUCKET =
  "contractor-portfolio";

type PortfolioRow = {
  project_id: string;
  contractor_id: string;

  title: string;
  description: string | null;
  city: string | null;

  completed_year:
    number | null;

  project_created_at:
    Date | string;

  project_updated_at:
    Date | string;

  file_id:
    string | null;

  portfolio_project_id:
    string | null;

  uploaded_by:
    string | null;

  storage_bucket:
    string | null;

  storage_path:
    string | null;

  file_name:
    string | null;

  file_size:
    string | number | null;

  mime_type:
    string | null;

  sort_order:
    number | null;

  file_created_at:
    Date | string | null;
};

type PortfolioFile = {
  id: string;

  portfolio_project_id:
    string;

  uploaded_by:
    string;

  storage_bucket:
    string;

  storage_path:
    string;

  file_name:
    string;

  file_size:
    number;

  mime_type:
    string;

  sort_order:
    number;

  created_at:
    string;

  signed_url:
    string | null;
};

type PortfolioProject = {
  id: string;

  contractor_id:
    string;

  title: string;

  description:
    string | null;

  city:
    string | null;

  completed_year:
    number | null;

  created_at:
    string;

  updated_at:
    string;

  contractor_portfolio_files:
    PortfolioFile[];
};

export async function getMyContractorPortfolio(): Promise<
  PortfolioProject[]
> {
  /*
   * ========================================
   * 1. Текущий пользователь
   * ========================================
   */

  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    return [];
  }

  try {
    /*
     * ========================================
     * 2. Компания + портфолио + файлы
     * ========================================
     *
     * Всё читаем одним SQL запросом.
     */

    const result =
      await db.query<PortfolioRow>(
        `
          SELECT
            cpp.id
              AS project_id,

            cpp.contractor_id,

            cpp.title,
            cpp.description,
            cpp.city,
            cpp.completed_year,

            cpp.created_at
              AS project_created_at,

            cpp.updated_at
              AS project_updated_at,

            cpf.id
              AS file_id,

            cpf.portfolio_project_id,

            cpf.uploaded_by,

            cpf.storage_bucket,

            cpf.storage_path,

            cpf.file_name,

            cpf.file_size,

            cpf.mime_type,

            cpf.sort_order,

            cpf.created_at
              AS file_created_at

          FROM
            public.contractor_companies
              cc

          JOIN
            public.contractor_portfolio_projects
              cpp
            ON cpp.contractor_id =
              cc.id

          LEFT JOIN
            public.contractor_portfolio_files
              cpf
            ON cpf.portfolio_project_id =
              cpp.id

          WHERE
            cc.owner_id =
              $1

          ORDER BY
            cpp.created_at DESC,
            cpf.sort_order ASC,
            cpf.created_at ASC
        `,
        [
          userId,
        ]
      );

    if (
      result.rows.length ===
      0
    ) {
      return [];
    }

    /*
     * ========================================
     * 3. Собираем проекты
     * ========================================
     */

    const projectMap =
      new Map<
        string,
        PortfolioProject
      >();

    for (
      const row of
        result.rows
    ) {
      let project =
        projectMap.get(
          row.project_id
        );

      if (!project) {
        project = {
          id:
            row.project_id,

          contractor_id:
            row.contractor_id,

          title:
            row.title,

          description:
            row.description,

          city:
            row.city,

          completed_year:
            row.completed_year,

          created_at:
            toIsoString(
              row.project_created_at
            ),

          updated_at:
            toIsoString(
              row.project_updated_at
            ),

          contractor_portfolio_files:
            [],
        };

        projectMap.set(
          row.project_id,
          project
        );
      }

      /*
       * Проект может существовать
       * вообще без файлов.
       */
      if (
        !row.file_id ||
        !row.portfolio_project_id ||
        !row.uploaded_by ||
        !row.storage_path ||
        !row.file_name ||
        !row.mime_type
      ) {
        continue;
      }

      const bucket =
        row.storage_bucket ||
        PORTFOLIO_BUCKET;

      /*
       * ========================================
       * 4. Signed URL через MinIO
       * ========================================
       */

      let signedUrl:
        string | null =
        null;

      try {
        signedUrl =
          await getSignedFileUrl({
            bucket,

            key:
              row.storage_path,

            expiresIn:
              60 * 60,
          });
      } catch (error) {
        /*
         * Один отсутствующий объект
         * не должен ломать всё портфолио.
         */
        console.error(
          "Ошибка создания signed URL портфолио:",
          {
            fileId:
              row.file_id,

            bucket,

            storagePath:
              row.storage_path,

            error,
          }
        );
      }

      project
        .contractor_portfolio_files
        .push({
          id:
            row.file_id,

          portfolio_project_id:
            row.portfolio_project_id,

          uploaded_by:
            row.uploaded_by,

          storage_bucket:
            bucket,

          storage_path:
            row.storage_path,

          file_name:
            row.file_name,

          file_size:
            safeInteger(
              row.file_size
            ),

          mime_type:
            row.mime_type,

          sort_order:
            row.sort_order ??
            0,

          created_at:
            row.file_created_at
              ? toIsoString(
                  row.file_created_at
                )
              : "",

          signed_url:
            signedUrl,
        });
    }

    /*
     * ========================================
     * 5. Возвращаем прежний контракт
     * ========================================
     */

    return Array.from(
      projectMap.values()
    );
  } catch (error) {
    console.error(
      "Ошибка загрузки портфолио:",
      error
    );

    throw new Error(
      "Не удалось загрузить портфолио"
    );
  }
}

function safeInteger(
  value: unknown
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(
      number
    )
  );
}

function toIsoString(
  value:
    Date | string
) {
  if (
    value instanceof Date
  ) {
    return value
      .toISOString();
  }

  return String(value);
}