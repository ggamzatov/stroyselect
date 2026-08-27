import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, UsersRound } from "lucide-react";

import { ContractorCatalogCard } from "@/features/contractors/catalog/components/contractor-catalog-card";
import { ContractorCatalogFilters } from "@/features/contractors/catalog/components/contractor-catalog-filters";
import { getContractorCatalog } from "@/features/contractors/catalog/queries/get-contractor-catalog";
import { getContractorCatalogOptions } from "@/features/contractors/catalog/queries/get-contractor-catalog-options";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

type Props = {
  searchParams: Promise<PageSearchParams>;
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

export default async function CustomerContractorsPage({ searchParams }: Props) {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parsePositiveInteger(params.page) ?? 1;
  const minRating = parseNumber(params.minRating);
  const minBudget = parseNumber(params.minBudget);
  const maxBudget = parseNumber(params.maxBudget);
  const sort = parseSort(params.sort);

  const [catalog, options] = await Promise.all([
    getContractorCatalog({
      search: params.search,
      city: params.city,
      categoryId: params.categoryId,
      minRating,
      minBudget,
      maxBudget,
      acceptsProjectsOnly: params.acceptsProjectsOnly === "true",
      hasPortfolio: params.hasPortfolio === "true",
      sort,
      page,
    }),
    getContractorCatalogOptions(),
  ]);

  const hasFilters = Boolean(
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
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Каталог исполнителей</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-foreground sm:text-4xl">
              Специалисты и подрядчики
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Сравнивайте специализацию, рейтинг, отзывы, географию работы и выполненные проекты.
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
        </section>

        <div className="mt-6">
          <ContractorCatalogFilters
            values={{
              search: params.search ?? "",
              city: params.city ?? "",
              categoryId: params.categoryId ?? "",
              minRating: params.minRating ?? "",
              minBudget: params.minBudget ?? "",
              maxBudget: params.maxBudget ?? "",
              acceptsProjectsOnly: params.acceptsProjectsOnly === "true",
              hasPortfolio: params.hasPortfolio === "true",
              sort,
            }}
            categories={options.categories}
            cities={options.cities}
          />
        </div>

        <section className="mt-6" aria-labelledby="contractor-results-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Результаты поиска</p>
              <h2 id="contractor-results-title" className="mt-1 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                {catalog.total} {formatContractorCount(catalog.total)}
              </h2>
            </div>

            {hasFilters ? (
              <Link
                href="/customer/contractors"
                className="text-sm font-bold text-primary transition hover:opacity-80"
              >
                Сбросить фильтры
              </Link>
            ) : null}
          </div>

          {catalog.items.length === 0 ? (
            <div className="ui-v2-panel mt-4 flex min-h-[320px] items-center justify-center px-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <UsersRound className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-black tracking-tight text-foreground">Подрядчики не найдены</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Попробуйте изменить город, специализацию, рейтинг, бюджет или убрать часть фильтров.
                </p>
                <Link
                  href="/customer/contractors"
                  className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                >
                  Показать всех
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {catalog.items.map((contractor) => (
                  <ContractorCatalogCard key={contractor.id} contractor={contractor} />
                ))}
              </div>

              {catalog.total > catalog.pageSize ? (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Страница {catalog.page} из {catalog.totalPages}
                </p>
              ) : null}
            </>
          )}
        </section>

        {catalog.totalPages > 1 ? (
          <nav
            aria-label="Навигация по страницам каталога"
            className="mt-7 flex flex-wrap items-center justify-center gap-2"
          >
            {catalog.page > 1 ? (
              <Link
                href={buildPageHref(params, catalog.page - 1)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:bg-secondary"
              >
                ← Назад
              </Link>
            ) : null}

            {getPaginationPages(catalog.page, catalog.totalPages).map((pageNumber, index, pages) => {
              const previous = pages[index - 1];
              const showGap = previous !== undefined && pageNumber - previous > 1;

              return (
                <div key={pageNumber} className="flex items-center gap-2">
                  {showGap ? <span className="px-1 text-sm text-muted-foreground">…</span> : null}
                  <Link
                    href={buildPageHref(params, pageNumber)}
                    aria-current={pageNumber === catalog.page ? "page" : undefined}
                    className={[
                      "flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition",
                      pageNumber === catalog.page
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    {pageNumber}
                  </Link>
                </div>
              );
            })}

            {catalog.page < catalog.totalPages ? (
              <Link
                href={buildPageHref(params, catalog.page + 1)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:bg-secondary"
              >
                Далее →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </main>
  );
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function parsePositiveInteger(value: string | undefined) {
  const number = parseNumber(value);
  if (number === undefined || number < 1) return undefined;
  return Math.floor(number);
}

function parseSort(
  value: string | undefined
): "recommended" | "rating" | "reviews" | "completed" | "newest" {
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

function buildPageHref(params: PageSearchParams, page: number) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "page") continue;
    searchParams.set(key, value);
  }
  searchParams.set("page", String(page));
  const query = searchParams.toString();
  return query ? `/customer/contractors?${query}` : "/customer/contractors";
}

function getPaginationPages(current: number, total: number) {
  const values = new Set<number>([1, total]);
  for (let index = current - 2; index <= current + 2; index += 1) {
    if (index >= 1 && index <= total) values.add(index);
  }
  return Array.from(values).sort((first, second) => first - second);
}

function formatContractorCount(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "подрядчиков";
  if (last === 1) return "подрядчик";
  if (last >= 2 && last <= 4) return "подрядчика";
  return "подрядчиков";
}
