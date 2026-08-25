import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BriefcaseBusiness, CircleCheck, Info, MapPin, Search, Star } from "lucide-react";

import { AdSlot } from "@/features/ads/components/ad-slot";
import { getContractorCatalog } from "@/features/contractors/catalog/queries/get-contractor-catalog";
import { getContractorCatalogOptions } from "@/features/contractors/catalog/queries/get-contractor-catalog-options";

export const metadata: Metadata = {
  title: "Подрядчики — СтройВыбор",
  description: "Проверенные подрядчики по строительству, ремонту и инженерным работам. Сравнивайте специализацию, города, рейтинг и выполненные проекты.",
};

type SearchParams = {
  search?: string;
  city?: string;
  categoryId?: string;
  minRating?: string;
  acceptsProjectsOnly?: string;
  hasPortfolio?: string;
  sort?: string;
  page?: string;
};

type Props = { searchParams: Promise<SearchParams> };

export default async function PublicContractorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const minRating = Number(params.minRating);
  const sort = normalizeSort(params.sort);
  const acceptsProjectsOnly = params.acceptsProjectsOnly === "1";
  const hasPortfolio = params.hasPortfolio === "1";

  const [catalog, options] = await Promise.all([
    getContractorCatalog({
      search: params.search,
      city: params.city,
      categoryId: params.categoryId,
      minRating: Number.isFinite(minRating) && minRating > 0 ? minRating : undefined,
      acceptsProjectsOnly,
      hasPortfolio,
      sort,
      page,
    }),
    getContractorCatalogOptions(),
  ]);

  const filtered = Boolean(
    params.search || params.city || params.categoryId || params.minRating || acceptsProjectsOnly || hasPortfolio || params.sort
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-10 md:py-14">
        <header className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-9">
          <p className="text-sm font-semibold text-primary">СтройВыбор · каталог</p>
          <h1 className="mt-2 max-w-3xl break-words text-4xl font-black tracking-[-0.04em] md:text-5xl">Проверенные подрядчики для вашего проекта</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">Сравнивайте специализацию, географию, подтверждённый профиль, реальные отзывы, портфолио и опыт выполненных проектов.</p>
          <div className="mt-6"><Link href="/register" className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Создать проект</Link></div>
        </header>

        <AdSlot placement="contractor_boost" city={params.city ?? null} className="mt-6" />

        <form className="mt-6 rounded-[1.5rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_190px_230px_160px_190px_auto]">
            <label className="relative min-w-0"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input name="search" defaultValue={params.search ?? ""} className="stroy-input pl-10" placeholder="Название подрядчика" /></label>
            <select name="city" aria-label="Город" defaultValue={params.city ?? ""} className="stroy-select"><option value="">Все города</option>{options.cities.map((city) => <option key={city.value} value={city.value}>{city.label}</option>)}</select>
            <select name="categoryId" aria-label="Специализация" defaultValue={params.categoryId ?? ""} className="stroy-select"><option value="">Все специализации</option>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
            <select name="minRating" aria-label="Минимальный рейтинг" defaultValue={params.minRating ?? ""} className="stroy-select"><option value="">Любой рейтинг</option><option value="4.5">От 4,5</option><option value="4">От 4,0</option><option value="3.5">От 3,5</option></select>
            <select name="sort" aria-label="Сортировка" defaultValue={sort} className="stroy-select"><option value="recommended">Рекомендуемые</option><option value="rating">По рейтингу</option><option value="reviews">По отзывам</option><option value="completed">По опыту</option><option value="newest">Новые профили</option></select>
            <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Найти</button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"><input type="checkbox" name="acceptsProjectsOnly" value="1" defaultChecked={acceptsProjectsOnly} className="h-4 w-4 accent-[var(--primary)]" />Принимают новые проекты</label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"><input type="checkbox" name="hasPortfolio" value="1" defaultChecked={hasPortfolio} className="h-4 w-4 accent-[var(--primary)]" />Есть портфолио</label>
            {filtered && <Link href="/contractors" className="ml-auto text-sm font-semibold text-primary">Сбросить фильтры</Link>}
          </div>
        </form>

        <div className="mt-8 flex items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">Найдено</p><h2 className="mt-1 text-2xl font-black">{catalog.total} подрядчиков</h2></div></div>

        {catalog.items.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">{catalog.items.map((contractor) => (
            <article key={contractor.id} className="flex min-w-0 flex-col rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Проверен</span>
                    {contractor.accepts_new_projects && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-primary"><CircleCheck className="h-3.5 w-3.5" />Принимает проекты</span>}
                  </div>
                  <h3 className="mt-3 break-words text-xl font-black">{contractor.public_name}</h3>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-black text-primary">{Math.round(contractor.recommendation_score)}</p>
                  <p className="whitespace-nowrap text-[11px] text-muted-foreground">Рейтинг СтройВыбор</p>
                  <p className="mt-1 whitespace-nowrap text-[11px] font-semibold text-muted-foreground">{confidenceLabel(contractor.score_confidence_level)} · {contractor.score_confidence_percent}%</p>
                </div>
              </div>

              {contractor.description && <p className="mt-4 line-clamp-3 break-words text-sm leading-6 text-muted-foreground">{contractor.description}</p>}

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/45 p-3 text-xs leading-5 text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="break-words">{contractor.score_confidence_explanation}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" />{contractor.rating.toFixed(1)} · {contractor.rating_count} отзывов</span>
                <span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-4 w-4" />{contractor.completed_projects_count} проектов</span>
                <span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-4 w-4" />{contractor.portfolio_count} работ в портфолио</span>
                {contractor.areas[0] && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{contractor.areas[0].city}</span>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">{contractor.services.slice(0,4).map((service) => <span key={service.id} className="max-w-full break-words rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">{service.name}</span>)}</div>
              <Link href={`/contractors/${contractor.id}`} className="mt-auto pt-5"><span className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-secondary">Открыть профиль</span></Link>
            </article>
          ))}</div>
        ) : <div className="mt-6 rounded-[1.75rem] border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">По выбранным условиям подрядчиков пока нет. Измените фильтры или создайте проект — подбор можно продолжить через СтройВыбор.</div>}

        {catalog.totalPages > 1 && <nav className="mt-8 flex justify-center gap-2">{Array.from({ length: catalog.totalPages }, (_, index) => index + 1).slice(Math.max(0,page-3), Math.min(catalog.totalPages,page+2)).map((number) => <Link key={number} href={buildHref(params,number)} className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold ${number===page ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{number}</Link>)}</nav>}
      </div>
    </main>
  );
}

function confidenceLabel(value: "low" | "medium" | "high") {
  return value === "high" ? "Высокая достоверность" : value === "medium" ? "Средняя достоверность" : "Низкая достоверность";
}

function normalizeSort(value?: string): "recommended" | "rating" | "reviews" | "completed" | "newest" {
  return value === "rating" || value === "reviews" || value === "completed" || value === "newest" ? value : "recommended";
}

function buildHref(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && value) query.set(key, value);
  }
  query.set("page", String(page));
  return `/contractors?${query}`;
}