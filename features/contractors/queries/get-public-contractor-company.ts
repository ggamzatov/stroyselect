import "server-only";

import { notFound } from
  "next/navigation";

import { db } from
  "@/lib/db/pool";

import { createClient } from
  "@/lib/supabase/server";

import { getSignedFileUrl } from
  "@/lib/storage/get-signed-file-url";

const PORTFOLIO_BUCKET =
  "contractor-portfolio";

type CompanyRow = {
  id: string;
  public_name: string;
  legal_name: string | null;
  company_type: string | null;
  inn: string | null;
  ogrn: string | null;
  description: string | null;
  founded_year: number | null;
  employee_count: number | null;

  minimum_project_budget:
    string | number | null;

  maximum_project_budget:
    string | number | null;

  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  telegram: string | null;

  rating:
    string | number;

  rating_count:
    number;

  quality_rating:
    string | number | null;

  deadline_rating:
    string | number | null;

  communication_rating:
    string | number | null;

  completed_projects_count:
    number;

  verification_status:
    string;

  created_at:
    Date | string;
};

type ServiceRow = {
  category_id:
    string | number;

  category_name:
    string;
};

type AreaRow = {
  city: string;
  region: string;
  travel_radius_km:
    number | null;
  is_primary:
    boolean;
};

type PortfolioRow = {
  project_id: string;
  contractor_id: string;
  title: string;
  description:
    string | null;
  city:
    string | null;
  completed_year:
    number | null;
  project_created_at:
    Date | string;

  file_id:
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

export async function getPublicContractorCompany(
  companyId: string
) {
  /*
   * ========================================
   * 1. Авторизация
   * ========================================
   *
   * Пока оставляем Supabase Auth.
   * Database и Storage уже наши.
   */

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase
      .auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    throw new Error(
      "Необходимо войти"
    );
  }

  /*
   * ========================================
   * 2. Компания
   * ========================================
   */

  const companyResult =
    await db.query<CompanyRow>(
      `
        SELECT
          id,
          public_name,
          legal_name,
          company_type,
          inn,
          ogrn,
          description,
          founded_year,
          employee_count,
          minimum_project_budget,
          maximum_project_budget,
          contact_phone,
          contact_email,
          website,
          telegram,
          rating,
          rating_count,
          quality_rating,
          deadline_rating,
          communication_rating,
          completed_projects_count,
          verification_status,
          created_at
        FROM
          public.contractor_companies
        WHERE
          id = $1
          AND
          verification_status =
            'verified'
        LIMIT 1
      `,
      [
        companyId,
      ]
    );

  const company =
    companyResult
      .rows[0];

  if (!company) {
    notFound();
  }

  /*
   * ========================================
   * 3. Связанные данные
   * ========================================
   */

  const [
    servicesResult,
    areasResult,
    portfolioResult,
  ] =
    await Promise.all([
      /*
       * Специализации.
       */
      db.query<ServiceRow>(
        `
          SELECT
            cs.category_id,
            sc.name
              AS category_name
          FROM
            public.contractor_services
              cs
          JOIN
            public.service_categories
              sc
            ON sc.id =
              cs.category_id
          WHERE
            cs.contractor_id =
              $1
          ORDER BY
            cs.is_primary DESC,
            sc.name ASC
        `,
        [
          companyId,
        ]
      ),

      /*
       * География.
       */
      db.query<AreaRow>(
        `
          SELECT
            city,
            region,
            travel_radius_km,
            is_primary
          FROM
            public.contractor_service_areas
          WHERE
            contractor_id =
              $1
          ORDER BY
            is_primary DESC,
            city ASC
        `,
        [
          companyId,
        ]
      ),

      /*
       * Портфолио + файлы.
       *
       * LEFT JOIN нужен, чтобы
       * проект без файлов тоже
       * попал в результат.
       */
      db.query<PortfolioRow>(
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

            cpf.id
              AS file_id,

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
            public.contractor_portfolio_projects
              cpp

          LEFT JOIN
            public.contractor_portfolio_files
              cpf
            ON cpf.portfolio_project_id =
              cpp.id

          WHERE
            cpp.contractor_id =
              $1

          ORDER BY
            cpp.created_at DESC,
            cpf.sort_order ASC,
            cpf.created_at ASC
        `,
        [
          companyId,
        ]
      ),
    ]);

  /*
   * ========================================
   * 4. Нормализуем services
   * ========================================
   *
   * Сохраняем прежний контракт,
   * который уже использует page.tsx.
   */

  const contractorServices =
    servicesResult.rows.map(
      (service) => ({
        category_id:
          String(
            service.category_id
          ),

        service_categories: {
          id:
            String(
              service.category_id
            ),

          name:
            service.category_name,
        },
      })
    );

  /*
   * ========================================
   * 5. Нормализуем areas
   * ========================================
   */

  const contractorServiceAreas =
    areasResult.rows.map(
      (area) => ({
        city:
          area.city,

        region:
          area.region,

        travel_radius_km:
          area.travel_radius_km,

        is_primary:
          area.is_primary,
      })
    );

  /*
   * ========================================
   * 6. Собираем портфолио
   * ========================================
   */

  type PortfolioProject = {
    id: string;
    contractor_id: string;
    title: string;
    description:
      string | null;
    city:
      string | null;
    completed_year:
      number | null;
    created_at: string;

    contractor_portfolio_files:
      PortfolioFile[];
  };

  type PortfolioFile = {
    id: string;
    portfolio_project_id:
      string;
    uploaded_by: string;
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

  const portfolioMap =
    new Map<
      string,
      PortfolioProject
    >();

  for (
    const row of
      portfolioResult.rows
  ) {
    let project =
      portfolioMap.get(
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

        contractor_portfolio_files:
          [],
      };

      portfolioMap.set(
        row.project_id,
        project
      );
    }

    /*
     * LEFT JOIN может вернуть
     * проект без файла.
     */
    if (
      !row.file_id ||
      !row.storage_path ||
      !row.file_name ||
      !row.mime_type ||
      !row.uploaded_by
    ) {
      continue;
    }

    const bucket =
      row.storage_bucket ||
      PORTFOLIO_BUCKET;

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
       * Один повреждённый объект
       * не должен ронять весь
       * профиль подрядчика.
       */
      console.error(
        "Ошибка создания signed URL файла портфолио:",
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
          row.project_id,

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

  const contractorPortfolioProjects =
    Array.from(
      portfolioMap.values()
    );

  /*
   * ========================================
   * 7. Возвращаем прежний контракт
   * ========================================
   */

  return {
    id:
      company.id,

    public_name:
      company.public_name,

    legal_name:
      company.legal_name,

    company_type:
      company.company_type,

    inn:
      company.inn,

    ogrn:
      company.ogrn,

    description:
      company.description,

    founded_year:
      company.founded_year,

    employee_count:
      company.employee_count,

    minimum_project_budget:
      toNullableNumber(
        company
          .minimum_project_budget
      ),

    maximum_project_budget:
      toNullableNumber(
        company
          .maximum_project_budget
      ),

    contact_phone:
      company.contact_phone,

    contact_email:
      company.contact_email,

    website:
      company.website,

    telegram:
      company.telegram,

    rating:
      safeNumber(
        company.rating
      ),

    rating_count:
      safeInteger(
        company.rating_count
      ),

    quality_rating:
      toNullableNumber(
        company
          .quality_rating
      ),

    deadline_rating:
      toNullableNumber(
        company
          .deadline_rating
      ),

    communication_rating:
      toNullableNumber(
        company
          .communication_rating
      ),

    completed_projects_count:
      safeInteger(
        company
          .completed_projects_count
      ),

    verification_status:
      company
        .verification_status,

    created_at:
      toIsoString(
        company.created_at
      ),

    contractor_services:
      contractorServices,

    contractor_service_areas:
      contractorServiceAreas,

    contractor_portfolio_projects:
      contractorPortfolioProjects,
  };
}

function safeNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
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

function toNullableNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
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