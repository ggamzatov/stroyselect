import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Star } from "lucide-react";

import { db } from "@/lib/db/pool";
import { getContractorCatalog } from "@/features/contractors/catalog/queries/get-contractor-catalog";

type Props = { params: Promise<{ category: string; city: string }> };
type CategoryRow = { id: number; name: string; slug: string };

async function resolveCategory(slug: string) {
  const result = await db.query<CategoryRow>(`SELECT id,name,slug FROM public.service_categories WHERE slug=$1 AND is_active=true LIMIT 1`, [slug]);
  return result.rows[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, city } = await params;
  const service = await resolveCategory(category);
  const cityName = normalizeCity(city);
  if (!service) return { title: "Услуга — СтройВыбор" };
  return {
    title: `${service.name} в ${cityName} — подрядчики | СтройВыбор`,
    description: `Проверенные подрядчики: ${service.name.toLocaleLowerCase("ru-RU")} в ${cityName}. Рейтинг, опыт, портфолио и отзывы в СтройВыборе.`,
  };
}

export default async function ServiceCityPage({ params }: Props) {
  const { category, city } = await params;
  const service = await resolveCategory(category);
  if (!service) notFound();
  const cityName = normalizeCity(city);
  const catalog = await getContractorCatalog({ categoryId: String(service.id), city: cityName, acceptsProjectsOnly: false, hasPortfolio: false, sort: "recommended", page: 1 });

  return (
    <main className="min-h-screen bg-background"><div className="app-container py-10 md:py-14">
      <nav className="text-sm text-muted-foreground"><Link href="/contractors" className="hover:text-primary">Подрядчики</Link> <span>→</span> <span>{service.name}</span> <span>→</span> <span>{cityName}</span></nav>
      <header className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-9"><p className="text-sm font-semibold text-primary">Подрядчики в вашем городе</p><h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">{service.name} в {cityName}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Сравните проверенных исполнителей, их рейтинг, выполненные проекты и опыт по выбранной специализации.</p><Link href="/register" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Разместить проект</Link></header>
      <div className="mt-8"><p className="text-sm text-muted-foreground">Найдено {catalog.total}</p><div className="mt-5 grid gap-5 lg:grid-cols-2">{catalog.items.map((item) => <article key={item.id} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex items-start justify-between gap-4"><div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Проверен</span><h2 className="mt-3 text-xl font-black">{item.public_name}</h2></div><strong className="text-xl text-primary">{Math.round(item.recommendation_score)}</strong></div><div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" />{item.rating.toFixed(1)} · {item.rating_count}</span><span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{cityName}</span></div>{item.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p>}<Link href={`/contractors/${item.id}`} className="mt-5 inline-flex rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Профиль подрядчика</Link></article>)}</div>{!catalog.items.length && <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Пока нет проверенных подрядчиков для этой комбинации. Оставьте проект — менеджер сможет подобрать исполнителей вручную.</div>}</div>
    </div></main>
  );
}

function normalizeCity(value: string) { return decodeURIComponent(value).replace(/-/g," ").replace(/(^|\s)\S/g,(letter) => letter.toLocaleUpperCase("ru-RU")); }
