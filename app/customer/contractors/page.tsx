import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Search, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";

import { ContractorCatalogCard } from "@/features/contractors/catalog/components/contractor-catalog-card";
import { ContractorCatalogFilters } from "@/features/contractors/catalog/components/contractor-catalog-filters";
import { getContractorCatalog } from "@/features/contractors/catalog/queries/get-contractor-catalog";
import { getContractorCatalogOptions } from "@/features/contractors/catalog/queries/get-contractor-catalog-options";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

type Props = { searchParams: Promise<PageSearchParams> };
type PageSearchParams = { search?: string; city?: string; categoryId?: string; minRating?: string; minBudget?: string; maxBudget?: string; acceptsProjectsOnly?: string; hasPortfolio?: string; sort?: string; page?: string };

export default async function CustomerContractorsPage({ searchParams }: Props) {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");
  const params = await searchParams;
  const page = parsePositiveInteger(params.page) ?? 1;
  const minRating = parseNumber(params.minRating);
  const minBudget = parseNumber(params.minBudget);
  const maxBudget = parseNumber(params.maxBudget);
  const sort = parseSort(params.sort);

  const [catalog, options] = await Promise.all([
    getContractorCatalog({ search: params.search, city: params.city, categoryId: params.categoryId, minRating, minBudget, maxBudget, acceptsProjectsOnly: params.acceptsProjectsOnly === "true", hasPortfolio: params.hasPortfolio === "true", sort, page }),
    getContractorCatalogOptions(),
  ]);

  const hasFilters = Boolean(params.search || params.city || params.categoryId || params.minRating || params.minBudget || params.maxBudget || params.acceptsProjectsOnly || params.hasPortfolio);
  const quickCategories = options.categories.slice(0, 6);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
      <div className="mx-auto max-w-[1320px]">
        <section className="rounded-[28px] border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-7 lg:p-8">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-bold text-primary"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Проверенные специалисты</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl lg:text-5xl">Найдите специалиста для вашей задачи</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Выберите услугу или напишите, кого ищете. Мы покажем подходящих подрядчиков и поможем сравнить их.</p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-background px-4 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Поиск специалиста</span>
              <form action="/customer/contractors" className="min-w-0 flex-1">
                <input name="search" defaultValue={params.search ?? ""} placeholder="Например: электрик или ремонт ванной" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </form>
            </div>
            <Link href="/customer/projects/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-95">
              Создать задачу <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {quickCategories.length > 0 ? (
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Популярные услуги">
              {quickCategories.map((category) => (
                <Link key={category.id} href={`/customer/contractors?categoryId=${encodeURIComponent(category.id)}`} className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-secondary">
                  {category.name}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-7" aria-labelledby="contractor-results-title">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Подбор</p>
              <h2 id="contractor-results-title" className="mt-1 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{catalog.total} {formatContractorCount(catalog.total)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Сначала показываем тех, кто лучше подходит по вашему запросу.</p>
            </div>
            <ContractorCatalogFilters
              values={{ search: params.search ?? "", city: params.city ?? "", categoryId: params.categoryId ?? "", minRating: params.minRating ?? "", minBudget: params.minBudget ?? "", maxBudget: params.maxBudget ?? "", acceptsProjectsOnly: params.acceptsProjectsOnly === "true", hasPortfolio: params.hasPortfolio === "true", sort }}
              categories={options.categories}
              cities={options.cities}
            />
          </div>

          {catalog.items.length === 0 ? (
            <div className="mt-5 flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 text-center">
              <div className="max-w-md"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary"><UsersRound className="h-6 w-6" aria-hidden="true" /></span><h3 className="mt-5 text-xl font-black">Пока никого не нашли</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Попробуйте выбрать другую услугу, изменить город или описать задачу иначе.</p>{hasFilters ? <Link href="/customer/contractors" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Сбросить поиск</Link> : null}</div>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{catalog.items.map((contractor) => <ContractorCatalogCard key={contractor.id} contractor={contractor} />)}</div>
              {catalog.totalPages > 1 ? <nav aria-label="Навигация по страницам каталога" className="mt-7 flex flex-wrap justify-center gap-2">{catalog.page > 1 ? <Link href={buildPageHref(params, catalog.page - 1)} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold">← Назад</Link> : null}<span className="flex items-center rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-primary">{catalog.page} / {catalog.totalPages}</span>{catalog.page < catalog.totalPages ? <Link href={buildPageHref(params, catalog.page + 1)} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold">Далее →</Link> : null}</nav> : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function parseNumber(value: string | undefined) { if (!value) return undefined; const number = Number(value); return Number.isFinite(number) ? number : undefined; }
function parsePositiveInteger(value: string | undefined) { const number = parseNumber(value); return number === undefined || number < 1 ? undefined : Math.floor(number); }
function parseSort(value: string | undefined): "recommended" | "rating" | "reviews" | "completed" | "newest" { return value === "rating" || value === "reviews" || value === "completed" || value === "newest" ? value : "recommended"; }
function buildPageHref(params: PageSearchParams, page: number) { const searchParams = new URLSearchParams(); for (const [key, value] of Object.entries(params)) { if (!value || key === "page") continue; searchParams.set(key, value); } searchParams.set("page", String(page)); const query = searchParams.toString(); return query ? `/customer/contractors?${query}` : "/customer/contractors"; }
function formatContractorCount(count: number) { const lastTwo = count % 100; const last = count % 10; if (lastTwo >= 11 && lastTwo <= 14) return "подрядчиков"; if (last === 1) return "подрядчик"; if (last >= 2 && last <= 4) return "подрядчика"; return "подрядчиков"; }
