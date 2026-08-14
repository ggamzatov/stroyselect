import "server-only";

import { db } from
  "@/lib/db/pool";

import type {
  ContractorCatalogFilters,
  ContractorCatalogItem,
  ContractorCatalogResult,
} from
  "@/features/contractors/catalog/types/contractor-catalog";

const DEFAULT_PAGE_SIZE = 12;

type ContractorCatalogDbRow = {
  id: string;

  public_name:
    string | null;

  company_type:
    string | null;

  description:
    string | null;

  founded_year:
    number | null;

  employee_count:
    number | null;

  minimum_project_budget:
    string | number | null;

  maximum_project_budget:
    string | number | null;

  verification_status:
    string;

  accepts_new_projects:
    boolean;

  rating:
    string | number | null;

  rating_count:
    number | null;

  quality_rating:
    string | number | null;

  deadline_rating:
    string | number | null;

  communication_rating:
    string | number | null;

  completed_projects_count:
    number | null;

  recommendation_score:
    string | number | null;

  created_at:
    Date | string;

  services:
    unknown;

  areas:
    unknown;

  portfolio_count:
    string | number;

  total_count:
    string | number;
};

type ServiceItem = {
  id: string;
  name: string;
};

type AreaItem = {
  city: string;
  region: string | null;
  is_primary: boolean;
};

export async function getContractorCatalog(
  filters: ContractorCatalogFilters
): Promise<ContractorCatalogResult> {
  const page =
    Math.max(
      1,
      filters.page ?? 1
    );

  const pageSize =
    DEFAULT_PAGE_SIZE;

  const offset =
    (page - 1) *
    pageSize;

  const values:
    unknown[] = [];

  const conditions:
    string[] = [
      `cc.verification_status = 'verified'`,
    ];

  /*
   * Поиск по названию.
   */
  const search =
    filters.search
      ?.trim();

  if (search) {
    values.push(
      `%${escapeLikePattern(
        search
      )}%`
    );

    conditions.push(`
      cc.public_name
        ILIKE $${values.length}
        ESCAPE '\\'
    `);
  }

  /*
   * Только принимающие проекты.
   */
  if (
    filters
      .acceptsProjectsOnly
  ) {
    conditions.push(`
      cc.accepts_new_projects = true
    `);
  }

  /*
   * Минимальный рейтинг.
   */
  if (
    filters.minRating !==
      undefined &&
    Number.isFinite(
      filters.minRating
    )
  ) {
    values.push(
      filters.minRating
    );

    conditions.push(`
      cc.rating >=
        $${values.length}
    `);
  }

  /*
   * Минимальный бюджет проекта.
   *
   * Максимальный бюджет подрядчика
   * должен быть не меньше бюджета
   * заказчика.
   */
  if (
    filters.minBudget !==
      undefined &&
    Number.isFinite(
      filters.minBudget
    )
  ) {
    values.push(
      filters.minBudget
    );

    conditions.push(`
      (
        cc.maximum_project_budget
          IS NULL
        OR
        cc.maximum_project_budget
          >= $${values.length}
      )
    `);
  }

  /*
   * Максимальный бюджет проекта.
   */
  if (
    filters.maxBudget !==
      undefined &&
    Number.isFinite(
      filters.maxBudget
    )
  ) {
    values.push(
      filters.maxBudget
    );

    conditions.push(`
      (
        cc.minimum_project_budget
          IS NULL
        OR
        cc.minimum_project_budget
          <= $${values.length}
      )
    `);
  }

  /*
   * Город.
   */
  const city =
    filters.city
      ?.trim();

  if (city) {
    values.push(city);

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM
          public.contractor_service_areas
            csa_filter
        WHERE
          csa_filter.contractor_id =
            cc.id
          AND
          csa_filter.city
            ILIKE $${values.length}
      )
    `);
  }

  /*
   * Специализация.
   */
  const categoryId =
    filters.categoryId
      ?.trim();

  if (categoryId) {
    values.push(
      categoryId
    );

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM
          public.contractor_services
            cs_filter
        WHERE
          cs_filter.contractor_id =
            cc.id
          AND
          cs_filter.category_id =
            $${values.length}
      )
    `);
  }

  /*
   * Только с портфолио.
   */
  if (
    filters.hasPortfolio
  ) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM
          public.contractor_portfolio_projects
            cpp_filter
        WHERE
          cpp_filter.contractor_id =
            cc.id
      )
    `);
  }

  const whereSql =
    conditions.join(
      "\nAND "
    );

  const orderSql =
    getOrderSql(
      filters.sort
    );

  /*
   * LIMIT и OFFSET тоже передаём
   * параметрами.
   */
  values.push(
    pageSize
  );

  const limitParameter =
    values.length;

  values.push(
    offset
  );

  const offsetParameter =
    values.length;

  try {
    const result =
      await db.query<ContractorCatalogDbRow>(
        `
          SELECT
            cc.id,

            cc.public_name,
            cc.company_type,
            cc.description,

            cc.founded_year,
            cc.employee_count,

            cc.minimum_project_budget,
            cc.maximum_project_budget,

            cc.verification_status,
            cc.accepts_new_projects,

            cc.rating,
            cc.rating_count,

            cc.quality_rating,
            cc.deadline_rating,
            cc.communication_rating,

            cc.completed_projects_count,

            cc.recommendation_score,

            cc.created_at,

            COALESCE(
              (
                SELECT
                  jsonb_agg(
                    jsonb_build_object(
                      'id',
                      sc.id,

                      'name',
                      sc.name
                    )
                    ORDER BY
                      sc.name ASC
                  )
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
                    cc.id
              ),
              '[]'::jsonb
            ) AS services,

            COALESCE(
              (
                SELECT
                  jsonb_agg(
                    jsonb_build_object(
                      'city',
                      csa.city,

                      'region',
                      csa.region,

                      'is_primary',
                      csa.is_primary
                    )
                    ORDER BY
                      csa.is_primary DESC,
                      csa.city ASC
                  )
                FROM
                  public.contractor_service_areas
                    csa
                WHERE
                  csa.contractor_id =
                    cc.id
                  AND
                  csa.city IS NOT NULL
              ),
              '[]'::jsonb
            ) AS areas,

            (
              SELECT
                COUNT(*)
              FROM
                public.contractor_portfolio_projects
                  cpp
              WHERE
                cpp.contractor_id =
                  cc.id
            ) AS portfolio_count,

            COUNT(*) OVER()
              AS total_count

          FROM
            public.contractor_companies
              cc

          WHERE
            ${whereSql}

          ORDER BY
            ${orderSql}

          LIMIT
            $${limitParameter}

          OFFSET
            $${offsetParameter}
        `,
        values
      );

    /*
     * COUNT(*) OVER() позволяет
     * получить total вместе с
     * результатами каталога.
     */
    const total =
      result.rows.length > 0
        ? safeInteger(
            result.rows[0]
              .total_count
          )
        : await countContractors(
            whereSql,
            values.slice(
              0,
              -2
            )
          );

    const items =
      result.rows.map(
        normalizeContractor
      );

    const totalPages =
      total === 0
        ? 1
        : Math.ceil(
            total /
            pageSize
          );

    return {
      items,

      total,

      page,

      pageSize,

      totalPages,
    };
  } catch (error) {
    console.error(
      "Ошибка загрузки каталога подрядчиков:",
      error
    );

    throw new Error(
      "Не удалось загрузить подрядчиков"
    );
  }
}

/*
 * Если OFFSET оказался за пределами
 * последней страницы, основной запрос
 * вернёт 0 строк.
 *
 * В этом случае отдельно узнаём total,
 * чтобы сохранить старое поведение
 * каталога.
 */
async function countContractors(
  whereSql: string,
  values: unknown[]
) {
  const result =
    await db.query<{
      total: string;
    }>(
      `
        SELECT
          COUNT(*) AS total
        FROM
          public.contractor_companies
            cc
        WHERE
          ${whereSql}
      `,
      values
    );

  return safeInteger(
    result.rows[0]
      ?.total
  );
}

function getOrderSql(
  sort:
    ContractorCatalogFilters["sort"]
) {
  switch (sort) {
    case "rating":
      return `
        cc.rating DESC NULLS LAST,
        cc.rating_count DESC,
        cc.completed_projects_count DESC,
        cc.id ASC
      `;

    case "reviews":
      return `
        cc.rating_count DESC,
        cc.rating DESC NULLS LAST,
        cc.completed_projects_count DESC,
        cc.id ASC
      `;

    case "completed":
      return `
        cc.completed_projects_count DESC,
        cc.rating DESC NULLS LAST,
        cc.rating_count DESC,
        cc.id ASC
      `;

    case "newest":
      return `
        cc.created_at DESC,
        cc.rating DESC NULLS LAST,
        cc.id ASC
      `;

    case "recommended":
    default:
      return `
        cc.recommendation_score DESC NULLS LAST,
        cc.rating DESC NULLS LAST,
        cc.rating_count DESC,
        cc.completed_projects_count DESC,
        cc.id ASC
      `;
  }
}

function normalizeContractor(
  company: ContractorCatalogDbRow
): ContractorCatalogItem {
  const services =
    normalizeServices(
      company.services
    );

  const areas =
    normalizeAreas(
      company.areas
    );

  return {
    id:
      String(
        company.id
      ),

    public_name:
      String(
        company.public_name ??
        "Подрядчик"
      ),

    company_type:
      company.company_type ??
      null,

    description:
      company.description ??
      null,

    founded_year:
      toNullableInteger(
        company.founded_year
      ),

    employee_count:
      toNullableInteger(
        company.employee_count
      ),

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

    verification_status:
      String(
        company
          .verification_status ??
        ""
      ),

    accepts_new_projects:
      Boolean(
        company
          .accepts_new_projects
      ),

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

    recommendation_score:
      safeNumber(
        company
          .recommendation_score
      ),

    created_at:
      company.created_at instanceof
      Date
        ? company.created_at
            .toISOString()
        : String(
            company.created_at
          ),

    services,

    areas,

    portfolio_count:
      safeInteger(
        company
          .portfolio_count
      ),
  };
}

function normalizeServices(
  value: unknown
): ServiceItem[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  const serviceMap =
    new Map<
      string,
      ServiceItem
    >();

  for (
    const item of value
  ) {
    if (
      !isRecord(item)
    ) {
      continue;
    }

    if (
      item.id === null ||
      item.id ===
        undefined ||
      !item.name
    ) {
      continue;
    }

    const id =
      String(
        item.id
      );

    if (
      serviceMap.has(id)
    ) {
      continue;
    }

    serviceMap.set(
      id,
      {
        id,

        name:
          String(
            item.name
          ),
      }
    );
  }

  return Array.from(
    serviceMap.values()
  );
}

function normalizeAreas(
  value: unknown
): AreaItem[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is Record<
        string,
        unknown
      > =>
        isRecord(item) &&
        Boolean(item.city)
    )
    .map(
      (item) => ({
        city:
          String(
            item.city
          ),

        region:
          item.region
            ? String(
                item.region
              )
            : null,

        is_primary:
          Boolean(
            item.is_primary
          ),
      })
    )
    .sort(
      (
        first,
        second
      ) => {
        if (
          first.is_primary !==
          second.is_primary
        ) {
          return first.is_primary
            ? -1
            : 1;
        }

        return first.city
          .localeCompare(
            second.city,
            "ru"
          );
      }
    );
}

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null
  );
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

function toNullableInteger(
  value: unknown
) {
  const number =
    toNullableNumber(
      value
    );

  if (
    number === null
  ) {
    return null;
  }

  return Math.trunc(
    number
  );
}

function escapeLikePattern(
  value: string
) {
  return value
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /%/g,
      "\\%"
    )
    .replace(
      /_/g,
      "\\_"
    );
}