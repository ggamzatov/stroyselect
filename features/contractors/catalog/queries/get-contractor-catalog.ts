import { createClient } from
  "@/lib/supabase/server";

import type {
  ContractorCatalogFilters,
  ContractorCatalogItem,
  ContractorCatalogResult,
} from
  "@/features/contractors/catalog/types/contractor-catalog";

const DEFAULT_PAGE_SIZE = 12;

export async function getContractorCatalog(
  filters: ContractorCatalogFilters
): Promise<ContractorCatalogResult> {
  const supabase =
    await createClient();

  const page =
    Math.max(
      1,
      filters.page ?? 1
    );

  const pageSize =
    DEFAULT_PAGE_SIZE;

  const from =
    (page - 1) *
    pageSize;

  const to =
    from +
    pageSize -
    1;

  /*
   * Основной запрос.
   *
   * В публичный каталог выводим
   * только проверенных подрядчиков.
   */
  let query =
    supabase
      .from(
        "contractor_companies"
      )
      .select(
        `
          id,
          public_name,
          company_type,
          description,
          founded_year,
          employee_count,

          minimum_project_budget,
          maximum_project_budget,

          verification_status,
          accepts_new_projects,

          rating,
          rating_count,
          quality_rating,
          deadline_rating,
          communication_rating,
          completed_projects_count,

          recommendation_score,

          created_at,

          contractor_services (
            category_id,

            service_categories (
              id,
              name
            )
          ),

          contractor_service_areas (
            city,
            region,
            is_primary
          ),

          contractor_portfolio_projects (
            id
          )
        `,
        {
          count: "exact",
        }
      )
      .eq(
        "verification_status",
        "verified"
      );

  /*
   * Поиск по названию компании.
   */
  const search =
    filters.search
      ?.trim();

  if (search) {
    query =
      query.ilike(
        "public_name",
        `%${escapeLikePattern(
          search
        )}%`
      );
  }

  /*
   * Только компании,
   * принимающие новые проекты.
   */
  if (
    filters
      .acceptsProjectsOnly
  ) {
    query =
      query.eq(
        "accepts_new_projects",
        true
      );
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
    query =
      query.gte(
        "rating",
        filters.minRating
      );
  }

  /*
   * Бюджет проекта от.
   *
   * Компания подходит,
   * если её максимальный бюджет
   * не меньше бюджета заказчика
   * либо верхний предел не указан.
   */
  if (
    filters.minBudget !==
      undefined &&
    Number.isFinite(
      filters.minBudget
    )
  ) {
    query =
      query.or(
        [
          "maximum_project_budget.is.null",
          `maximum_project_budget.gte.${filters.minBudget}`,
        ].join(",")
      );
  }

  /*
   * Бюджет проекта до.
   *
   * Компания подходит,
   * если её минимальный бюджет
   * не выше бюджета заказчика
   * либо нижний предел не указан.
   */
  if (
    filters.maxBudget !==
      undefined &&
    Number.isFinite(
      filters.maxBudget
    )
  ) {
    query =
      query.or(
        [
          "minimum_project_budget.is.null",
          `minimum_project_budget.lte.${filters.maxBudget}`,
        ].join(",")
      );
  }

  /*
   * Фильтрация по городу.
   *
   * Сначала получаем ID компаний
   * из contractor_service_areas.
   */
  if (
    filters.city
      ?.trim()
  ) {
    const city =
      filters.city.trim();

    const {
      data:
        areaCompanies,
      error:
        areaError,
    } =
      await supabase
        .from(
          "contractor_service_areas"
        )
        .select(
          "contractor_id"
        )
        .ilike(
          "city",
          city
        );

    if (areaError) {
      console.error(
        "Ошибка фильтрации подрядчиков по городу:",
        {
          message:
            areaError.message,

          details:
            areaError.details,

          hint:
            areaError.hint,

          code:
            areaError.code,
        }
      );

      throw new Error(
        "Не удалось применить фильтр по городу"
      );
    }

    const companyIds =
      getUniqueIds(
        areaCompanies
          ?.map(
            (item) =>
              item.contractor_id
          ) ??
        []
      );

    if (
      companyIds.length ===
      0
    ) {
      return emptyResult(
        page,
        pageSize
      );
    }

    query =
      query.in(
        "id",
        companyIds
      );
  }

  /*
   * Фильтрация по специализации.
   */
  if (
    filters.categoryId
      ?.trim()
  ) {
    const {
      data:
        serviceCompanies,
      error:
        serviceError,
    } =
      await supabase
        .from(
          "contractor_services"
        )
        .select(
          "contractor_id"
        )
        .eq(
          "category_id",
          filters.categoryId
        );

    if (serviceError) {
      console.error(
        "Ошибка фильтрации подрядчиков по специализации:",
        {
          message:
            serviceError.message,

          details:
            serviceError.details,

          hint:
            serviceError.hint,

          code:
            serviceError.code,
        }
      );

      throw new Error(
        "Не удалось применить фильтр по специализации"
      );
    }

    const companyIds =
      getUniqueIds(
        serviceCompanies
          ?.map(
            (item) =>
              item.contractor_id
          ) ??
        []
      );

    if (
      companyIds.length ===
      0
    ) {
      return emptyResult(
        page,
        pageSize
      );
    }

    query =
      query.in(
        "id",
        companyIds
      );
  }

  /*
   * Только компании
   * с портфолио.
   */
  if (
    filters.hasPortfolio
  ) {
    const {
      data:
        portfolioCompanies,
      error:
        portfolioError,
    } =
      await supabase
        .from(
          "contractor_portfolio_projects"
        )
        .select(
          "contractor_id"
        );

    if (
      portfolioError
    ) {
      console.error(
        "Ошибка фильтрации подрядчиков по портфолио:",
        {
          message:
            portfolioError.message,

          details:
            portfolioError.details,

          hint:
            portfolioError.hint,

          code:
            portfolioError.code,
        }
      );

      throw new Error(
        "Не удалось применить фильтр по портфолио"
      );
    }

    const companyIds =
      getUniqueIds(
        portfolioCompanies
          ?.map(
            (item) =>
              item.contractor_id
          ) ??
        []
      );

    if (
      companyIds.length ===
      0
    ) {
      return emptyResult(
        page,
        pageSize
      );
    }

    query =
      query.in(
        "id",
        companyIds
      );
  }

  /*
   * Сортировка.
   */
  switch (
    filters.sort
  ) {
    case "rating": {
      query =
        query
          .order(
            "rating",
            {
              ascending:
                false,
            }
          )
          .order(
            "rating_count",
            {
              ascending:
                false,
            }
          )
          .order(
            "completed_projects_count",
            {
              ascending:
                false,
            }
          );

      break;
    }

    case "reviews": {
      query =
        query
          .order(
            "rating_count",
            {
              ascending:
                false,
            }
          )
          .order(
            "rating",
            {
              ascending:
                false,
            }
          )
          .order(
            "completed_projects_count",
            {
              ascending:
                false,
            }
          );

      break;
    }

    case "completed": {
      query =
        query
          .order(
            "completed_projects_count",
            {
              ascending:
                false,
            }
          )
          .order(
            "rating",
            {
              ascending:
                false,
            }
          )
          .order(
            "rating_count",
            {
              ascending:
                false,
            }
          );

      break;
    }

    case "newest": {
      query =
        query
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .order(
            "rating",
            {
              ascending:
                false,
            }
          );

      break;
    }

    case "recommended":
    default: {
      /*
       * Главная сортировка каталога.
       *
       * recommendation_score
       * рассчитывается в БД.
       */
      query =
        query
          .order(
            "recommendation_score",
            {
              ascending:
                false,
            }
          )
          .order(
            "rating",
            {
              ascending:
                false,
            }
          )
          .order(
            "rating_count",
            {
              ascending:
                false,
            }
          )
          .order(
            "completed_projects_count",
            {
              ascending:
                false,
            }
          );

      break;
    }
  }

  /*
   * Чтобы порядок был стабильным,
   * последним критерием используем id.
   */
  query =
    query.order(
      "id",
      {
        ascending: true,
      }
    );

  /*
   * Пагинация.
   */
  query =
    query.range(
      from,
      to
    );

  const {
    data,
    error,
    count,
  } =
    await query;

  if (error) {
    console.error(
      "Ошибка загрузки каталога подрядчиков:",
      {
        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code,
      }
    );

    throw new Error(
      "Не удалось загрузить подрядчиков"
    );
  }

  const items =
    (
      data ??
      []
    ).map(
      normalizeContractor
    );

  const total =
    count ?? 0;

  /*
   * Если пользователь вручную
   * открыл страницу больше существующей,
   * данные просто будут пустыми.
   */
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
}

function normalizeContractor(
  company: any
): ContractorCatalogItem {
  /*
   * Специализации.
   */
  const serviceMap =
    new Map<
      string,
      {
        id: string;
        name: string;
      }
    >();

  for (
    const item of
      company
        .contractor_services ??
      []
  ) {
    const rawCategory =
      item
        .service_categories;

    const category =
      Array.isArray(
        rawCategory
      )
        ? rawCategory[0]
        : rawCategory;

    if (
      !category?.id ||
      !category?.name
    ) {
      continue;
    }

    const id =
      String(
        category.id
      );

    if (
      !serviceMap.has(
        id
      )
    ) {
      serviceMap.set(
        id,
        {
          id,
          name:
            category.name,
        }
      );
    }
  }

  const services =
    Array.from(
      serviceMap.values()
    );

  /*
   * География работы.
   */
  const areas =
    (
      company
        .contractor_service_areas ??
      []
    )
      .filter(
        (
          area: any
        ) =>
          Boolean(
            area.city
          )
      )
      .map(
        (
          area: any
        ) => ({
          city:
            String(
              area.city
            ),

          region:
            area.region
              ? String(
                  area.region
                )
              : null,

          is_primary:
            Boolean(
              area.is_primary
            ),
        })
      )
      .sort(
        (
          first: {
            is_primary:
              boolean;
            city: string;
          },
          second: {
            is_primary:
              boolean;
            city: string;
          }
        ) => {
          /*
           * Основной город
           * всегда первым.
           */
          if (
            first.is_primary !==
            second.is_primary
          ) {
            return first.is_primary
              ? -1
              : 1;
          }

          return first.city.localeCompare(
            second.city,
            "ru"
          );
        }
      );

  const portfolioCount =
    (
      company
        .contractor_portfolio_projects ??
      []
    ).length;

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
        company
          .rating_count
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
      String(
        company.created_at
      ),

    services,

    areas,

    portfolio_count:
      portfolioCount,
  };
}

function getUniqueIds(
  values:
    Array<
      string |
      null |
      undefined
    >
) {
  return Array.from(
    new Set(
      values.filter(
        (
          value
        ): value is string =>
          typeof value ===
            "string" &&
          value.length > 0
      )
    )
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

function emptyResult(
  page: number,
  pageSize: number
): ContractorCatalogResult {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
  };
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