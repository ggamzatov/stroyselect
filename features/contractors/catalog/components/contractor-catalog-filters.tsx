"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter, Search, X } from "lucide-react";

type Values = {
  search: string;
  city: string;
  categoryId: string;
  minRating: string;
  minBudget: string;
  maxBudget: string;
  acceptsProjectsOnly: boolean;
  hasPortfolio: boolean;
  sort: string;
};
type CategoryOption = { id: string; name: string };
type CityOption = { value: string; label: string };
type Props = { values: Values; categories: CategoryOption[]; cities: CityOption[] };

export function ContractorCatalogFilters({ values, categories, cities }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState(values);
  const [open, setOpen] = useState(false);

  function updateField<K extends keyof Values>(key: K, value: Values[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    setOrDelete(params, "search", form.search.trim());
    setOrDelete(params, "city", form.city);
    setOrDelete(params, "categoryId", form.categoryId);
    setOrDelete(params, "minRating", form.minRating);
    setOrDelete(params, "minBudget", form.minBudget);
    setOrDelete(params, "maxBudget", form.maxBudget);
    setBoolean(params, "acceptsProjectsOnly", form.acceptsProjectsOnly);
    setBoolean(params, "hasPortfolio", form.hasPortfolio);
    setOrDelete(params, "sort", form.sort);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/customer/contractors?${query}` : "/customer/contractors");
    setOpen(false);
  }

  function resetFilters() {
    const empty = { search: "", city: "", categoryId: "", minRating: "", minBudget: "", maxBudget: "", acceptsProjectsOnly: false, hasPortfolio: false, sort: "recommended" };
    setForm(empty);
    router.push("/customer/contractors");
    setOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground shadow-sm transition hover:bg-secondary">
        <Filter className="h-4 w-4" aria-hidden="true" />
        Фильтры
        {activeFilterCount(values) > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilterCount(values)}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-30 w-[min(92vw,440px)] rounded-2xl border border-border bg-card p-4 shadow-[0_16px_48px_rgba(20,35,27,0.14)] sm:p-5">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold">Настроить поиск</p><p className="mt-1 text-xs text-muted-foreground">Уточните параметры, чтобы быстрее найти подходящего специалиста.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Закрыть фильтры"><X className="h-4 w-4" /></button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="text-xs font-semibold text-muted-foreground">Поиск</span><span className="relative mt-1.5 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input value={form.search} onChange={(event) => updateField("search", event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyFilters()} placeholder="Электрик, сантехник, ремонт..." className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary" /></span></label>
            <Field label="Город"><select value={form.city} onChange={(event) => updateField("city", event.target.value)} className="catalog-control"><option value="">Все города</option>{cities.map((city) => <option key={city.value} value={city.value}>{city.label}</option>)}</select></Field>
            <Field label="Специализация"><select value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)} className="catalog-control"><option value="">Все услуги</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
            <Field label="Рейтинг"><select value={form.minRating} onChange={(event) => updateField("minRating", event.target.value)} className="catalog-control"><option value="">Любой</option><option value="4.5">4.5+</option><option value="4">4+</option><option value="3">3+</option></select></Field>
            <Field label="Сортировка"><select value={form.sort} onChange={(event) => updateField("sort", event.target.value)} className="catalog-control"><option value="recommended">Рекомендуемые</option><option value="rating">По рейтингу</option><option value="reviews">По отзывам</option><option value="completed">По проектам</option><option value="newest">Новые</option></select></Field>
            <Field label="Бюджет от"><input type="number" min="0" value={form.minBudget} onChange={(event) => updateField("minBudget", event.target.value)} placeholder="100 000" className="catalog-control" /></Field>
            <Field label="Бюджет до"><input type="number" min="0" value={form.maxBudget} onChange={(event) => updateField("maxBudget", event.target.value)} placeholder="5 000 000" className="catalog-control" /></Field>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold"><input type="checkbox" checked={form.acceptsProjectsOnly} onChange={(event) => updateField("acceptsProjectsOnly", event.target.checked)} className="h-4 w-4 accent-primary" /> Принимают проекты</label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold"><input type="checkbox" checked={form.hasPortfolio} onChange={(event) => updateField("hasPortfolio", event.target.checked)} className="h-4 w-4 accent-primary" /> Есть портфолио</label>
          </div>
          <div className="mt-5 flex gap-2 border-t border-border pt-4"><button type="button" onClick={applyFilters} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><Search className="h-4 w-4" />Применить</button><button type="button" onClick={resetFilters} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-bold"><X className="mr-1 h-4 w-4" />Сбросить</button></div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="text-xs font-semibold text-muted-foreground">{label}</span><span className="mt-1.5 block">{children}</span></label>; }
function activeFilterCount(values: Values) { return [values.city, values.categoryId, values.minRating, values.minBudget, values.maxBudget, values.acceptsProjectsOnly, values.hasPortfolio].filter(Boolean).length; }
function setOrDelete(params: URLSearchParams, key: string, value: string) { value ? params.set(key, value) : params.delete(key); }
function setBoolean(params: URLSearchParams, key: string, value: boolean) { value ? params.set(key, "true") : params.delete(key); }
