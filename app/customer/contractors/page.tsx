import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  Search,
  UsersRound,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getContractorCatalog } from
  "@/features/contractors/catalog/queries/get-contractor-catalog";

import { getContractorCatalogOptions } from
  "@/features/contractors/catalog/queries/get-contractor-catalog-options";

import { ContractorCatalogCard } from
  "@/features/contractors/catalog/components/contractor-catalog-card";

import { ContractorCatalogFilters } from
  "@/features/contractors/catalog/components/contractor-catalog-filters";

type Props = {
  searchParams: Promise<{
    search?: string;
    city?: string;
    categoryId?: string;
    minRating?: string;
    minBudget?: string;
    maxBudget?: string;
    acceptsProjectsOnly?: string;
    hasPortfolio?: string;
    sort?: string;
    page?: string;
  }>;
};

type PageSearchParams = {
  search?: string;
  city?: string;
  categoryId?: string;
  minRating?: string;
  minBudget?: string;
  maxBudget?: string;
  acceptsProjectsOnly?: string;
  hasPortfolio?: string;
  sort?: string;
  page?: string;
};

export default async function CustomerContractorsPage({
  searchParams,
}: Props) {
  /*
   * Проверяем текущего пользователя.
   */
  const {
    profile,
  } =
    await getCurrentProfile();

  /*
   * Каталог подрядчиков доступен
   * заказчикам.
   */
  if (
    profile.role !==
    "customer"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const params =
    await searchParams;

  /*
   * Номер страницы.
   */
  const page =
    parsePositiveInteger(
      params.page
    ) ?? 1;

  /*
   * Числовые фильтры.
   */
  const minRating =
    parseNumber(
      params.minRating
    );

  const minBudget =
    parseNumber(
      params.minBudget
    );

  const maxBudget =
    parseNumber(
      params.maxBudget
    );

  /*
   * Сортировка.
   */
  const sort =
    parseSort(
      params.sort
    );

  /*
   * Одновременно загружаем:
   *
   * 1. каталог подрядчиков;
   * 2. города;
   * 3. специализации.
   */
  const [
    catalog,
    options,
  ] =
    await Promise.all([
      getContractorCatalog({
        search:
          params.search,

        city:
          params.city,

        categoryId:
          params.categoryId,

        minRating,

        minBudget,

        maxBudget,

        acceptsProjectsOnly:
          params.acceptsProjectsOnly ===
          "true",

        hasPortfolio:
          params.hasPortfolio ===
          "true",

        sort,

        page,
      }),

      getContractorCatalogOptions(),
    ]);

  /*
   * Определяем наличие
   * активных фильтров.
   */
  const hasFilters =
    Boolean(
      params.search ||
      params.city ||
      params.categoryId ||
      params.minRating ||
      params.minBudget ||
      params.maxBudget ||
      params.acceptsProjectsOnly ||
      params.hasPortfolio
    );

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        {/* Назад */}

        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />

          Вернуться в кабинет
        </Link>

        {/* HERO */}

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">
                Каталог исполнителей
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
                Найдите подрядчика
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                Сравнивайте опыт,
                рейтинг, отзывы,
                специализации,
                географию работы и
                выполненные проекты.
              </p>
            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)]">
              <Search className="h-7 w-7" />
            </div>
          </div>
        </section>

        {/* Фильтры */}

        <div className="mt-6">
          <ContractorCatalogFilters
            values={{
              search:
                params.search ??
                "",

              city:
                params.city ??
                "",

              categoryId:
                params.categoryId ??
                "",

              minRating:
                params.minRating ??
                "",

              minBudget:
                params.minBudget ??
                "",

              maxBudget:
                params.maxBudget ??
                "",

              acceptsProjectsOnly:
                params.acceptsProjectsOnly ===
                "true",

              hasPortfolio:
                params.hasPortfolio ===
                "true",

              sort,
            }}
            categories={
              options.categories
            }
            cities={
              options.cities
            }
          />
        </div>

        {/* Результаты */}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Результаты поиска
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
              {catalog.total}{" "}
              {formatContractorCount(
                catalog.total
              )}
            </h2>
          </div>

          {hasFilters && (
            <Link
              href="/customer/contractors"
              className="text-sm font-semibold text-primary transition hover:opacity-80"
            >
              Сбросить фильтры
            </Link>
          )}
        </div>

        {/* Пустой результат */}

        {catalog.items.length ===
        0 ? (
          <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)] md:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <UsersRound className="h-6 w-6" />
            </div>

            <h3 className="mt-5 text-xl font-bold text-foreground">
              Подрядчики не найдены
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Попробуйте изменить
              город, специализацию,
              рейтинг, бюджет или
              убрать часть фильтров.
            </p>

            <Link
              href="/customer/contractors"
              className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Показать всех
            </Link>
          </section>
        ) : (
          <>
            {/* Карточки */}

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {catalog.items.map(
                (
                  contractor
                ) => (
                  <ContractorCatalogCard
                    key={
                      contractor.id
                    }
                    contractor={
                      contractor
                    }
                  />
                )
              )}
            </div>

            {/* Информация о странице */}

            {catalog.total >
              catalog.pageSize && (
              <p className="mt-5 text-center text-xs text-muted-foreground">
                Страница{" "}
                {catalog.page} из{" "}
                {
                  catalog.totalPages
                }
              </p>
            )}
          </>
        )}

        {/* Пагинация */}

        {catalog.totalPages >
          1 && (
          <nav
            aria-label="Навигация по страницам каталога"
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            {/* Предыдущая */}

            {catalog.page > 1 && (
              <Link
                href={buildPageHref(
                  params,
                  catalog.page -
                    1
                )}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                ← Назад
              </Link>
            )}

            {/* Номера */}

            {getPaginationPages(
              catalog.page,
              catalog.totalPages
            ).map(
              (
                pageNumber,
                index,
                pages
              ) => {
                const previous =
                  pages[
                    index - 1
                  ];

                const showGap =
                  previous !==
                    undefined &&
                  pageNumber -
                    previous >
                    1;

                return (
                  <div
                    key={
                      pageNumber
                    }
                    className="flex items-center gap-2"
                  >
                    {showGap && (
                      <span className="px-1 text-sm text-muted-foreground">
                        …
                      </span>
                    )}

                    <Link
                      href={buildPageHref(
                        params,
                        pageNumber
                      )}
                      aria-current={
                        pageNumber ===
                        catalog.page
                          ? "page"
                          : undefined
                      }
                      className={[
                        "flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition",
                        pageNumber ===
                        catalog.page
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-secondary",
                      ].join(
                        " "
                      )}
                    >
                      {
                        pageNumber
                      }
                    </Link>
                  </div>
                );
              }
            )}

            {/* Следующая */}

            {catalog.page <
              catalog.totalPages && (
              <Link
                href={buildPageHref(
                  params,
                  catalog.page +
                    1
                )}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                Далее →
              </Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}

/*
 * ========================================
 * Helpers
 * ========================================
 */

function parseNumber(
  value:
    | string
    | undefined
) {
  if (!value) {
    return undefined;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return undefined;
  }

  return number;
}

function parsePositiveInteger(
  value:
    | string
    | undefined
) {
  const number =
    parseNumber(
      value
    );

  if (
    number ===
      undefined ||
    number < 1
  ) {
    return undefined;
  }

  return Math.floor(
    number
  );
}

function parseSort(
  value:
    | string
    | undefined
):
  | "recommended"
  | "rating"
  | "reviews"
  | "completed"
  | "newest" {
  switch (value) {
    case "rating":
    case "reviews":
    case "completed":
    case "newest":
      return value;

    case "recommended":
    default:
      return "recommended";
  }
}

function buildPageHref(
  params:
    PageSearchParams,
  page: number
) {
  const searchParams =
    new URLSearchParams();

  for (
    const [
      key,
      value,
    ] of Object.entries(
      params
    )
  ) {
    if (
      !value ||
      key === "page"
    ) {
      continue;
    }

    searchParams.set(
      key,
      value
    );
  }

  searchParams.set(
    "page",
    String(page)
  );

  const query =
    searchParams.toString();

  return query
    ? `/customer/contractors?${query}`
    : "/customer/contractors";
}

function getPaginationPages(
  current: number,
  total: number
) {
  const values =
    new Set<number>();

  /*
   * Первая и последняя.
   */
  values.add(1);

  values.add(total);

  /*
   * Текущая ±2.
   */
  for (
    let index =
      current - 2;
    index <=
    current + 2;
    index++
  ) {
    if (
      index >= 1 &&
      index <= total
    ) {
      values.add(
        index
      );
    }
  }

  return Array.from(
    values
  ).sort(
    (
      first,
      second
    ) =>
      first - second
  );
}

function formatContractorCount(
  count: number
) {
  const lastTwo =
    count % 100;

  const last =
    count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "подрядчиков";
  }

  if (
    last === 1
  ) {
    return "подрядчик";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "подрядчика";
  }

  return "подрядчиков";
}