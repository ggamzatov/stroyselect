import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BriefcaseBusiness, MapPin, Search, Star } from "lucide-react";

import { getContractorCatalog } from "@/features/contractors/catalog/queries/get-contractor-catalog";
import { getContractorCatalogOptions } from "@/features/contractors/catalog/queries/get-contractor-catalog-options";

export const metadata: Metadata = {
  title: "Подрядчики — СтройВыбор",
  description: "Проверенные подрядчики по строительству, ремонту и инженерным работам. Сравнивайте специализацию, города, рейтинг и выполненные проекты.",
};

type Props = { searchParams: Promise<{ search?: string; city?: string; categoryId?: string; page?: string }> };

export default async function PublicContractorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [catalog, options] = await Promise.all([
    getContractorCatalog({ search: params.search, city: params.city, categoryId: params.categoryId, acceptsProjectsOnly: false, hasPortfolio: false, sort: "recommended", page }),
    getContractorCatalogOptions(),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-10 md:py-14">
        <header className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-9">
          <p className="text-sm font-semibold text-primary">СтройВыбор · каталог</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-black tracking-[-0.04em] md:text-5xl">Проверенные подрядчики для вашего проекта</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">Ищите по специализации и городу, изучайте опыт, рейтинг и портфолио до создания проекта.</p>
          <div className="mt-6"><Link href="/register" className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Создать проект</Link></div>
        </header>

        <form className="mt-6 grid gap-3 rounded-[1.5rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)] md:grid-cols-[1fr_220px_260px_auto]">
          <label className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input name="search" defaultValue={params.search ?? ""} className="stroy-input pl-10" placeholder="Название подрядчика" /></label>
          <select name="city" defaultValue={params.city ?? ""} className="stroy-select"><option value="">Все города</option>{options.cities.map((city) => <option key={city.value} value={city.value}>{city.label}</option>)}</select>
          <select name="categoryId" defaultValue={params.categoryId ?? ""} className="stroy-select"><option value="">Все специализации</option>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Найти</button>
        </form>

        <div className="mt-8 flex items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">Найдено</p><h2 className="mt-1 text-2xl font-black">{catalog.total} подрядчиков</h2></div>{(params.search || params.city || params.categoryId) && <Link href="/contractors" className="text-sm font-semibold text-primary">Сбросить</Link>}</div>

        {catalog.items.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">{catalog.items.map((contractor) => (
            <article key={contractor.id} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Проверен</div><h3 className="mt-3 text-xl font-black">{contractor.public_name}</h3></div><div className="text-right"><p className="text-xl font-black text-primary">{Math.round(contractor.recommendation_score)}</p><p className="text-[11px] text-muted-foreground">StroySelect Score</p></div></div>
              {contractor.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{contractor.description}</p>}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" />{contractor.rating.toFixed(1)} · {contractor.rating_count} отзывов</span><span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-4 w-4" />{contractor.completed_projects_count} проектов</span>{contractor.areas[0] && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{contractor.areas[0].city}</span>}</div>
              <div className="mt-4 flex flex-wrap gap-2">{contractor.services.slice(0,4).map((service) => <span key={service.id} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">{service.name}</span>)}</div>
              <Link href={`/contractors/${contractor.id}`} className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-secondary">Открыть профиль</Link>
            </article>
          ))}</div>
        ) : <div className="mt-6 rounded-[1.75rem] border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">По выбранным условиям подрядчиков пока нет.</div>}

        {catalog.totalPages > 1 && <nav className="mt-8 flex justify-center gap-2">{Array.from({ length: catalog.totalPages }, (_, index) => index + 1).slice(Math.max(0,page-3), Math.min(catalog.totalPages,page+2)).map((number) => <Link key={number} href={buildHref(params,number)} className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold ${number===page ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{number}</Link>)}</nav>}
      </div>
    </main>
  );
}

function buildHref(params: { search?: string; city?: string; categoryId?: string }, page: number) { const query = new URLSearchParams(); if (params.search) query.set("search",params.search); if (params.city) query.set("city",params.city); if (params.categoryId) query.set("categoryId",params.categoryId); query.set("page",String(page)); return `/contractors?${query}`; }
