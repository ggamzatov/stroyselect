import Link from "next/link";
import { BarChart3, Building2, MousePointerClick, Search, UsersRound } from "lucide-react";

import { db } from "@/lib/db/pool";

type TotalsRow = {
  catalog_views: string | number;
  profile_views: string | number;
  landing_views: string | number;
  cta_clicks: string | number;
};

type ContractorRow = {
  contractor_id: string;
  public_name: string;
  views: string | number;
};

type LandingRow = {
  category: string | null;
  city: string | null;
  views: string | number;
};

export default async function DiscoveryAnalyticsPage() {
  const [totalsResult, contractorResult, landingResult] = await Promise.all([
    db.query<TotalsRow>(`
      SELECT
        COUNT(*) FILTER (WHERE event_name='catalog_viewed') AS catalog_views,
        COUNT(*) FILTER (WHERE event_name='contractor_profile_viewed') AS profile_views,
        COUNT(*) FILTER (WHERE event_name='service_city_viewed') AS landing_views,
        COUNT(*) FILTER (WHERE event_name='project_cta_clicked') AS cta_clicks
      FROM public.marketplace_events
      WHERE occurred_at >= now() - interval '30 days'
    `),
    db.query<ContractorRow>(`
      SELECT me.contractor_id,COALESCE(cc.public_name,'Подрядчик') AS public_name,COUNT(*) AS views
      FROM public.marketplace_events me
      JOIN public.contractor_companies cc ON cc.id=me.contractor_id
      WHERE me.event_name='contractor_profile_viewed'
        AND me.occurred_at >= now() - interval '30 days'
      GROUP BY me.contractor_id,cc.public_name
      ORDER BY COUNT(*) DESC,cc.public_name ASC
      LIMIT 10
    `),
    db.query<LandingRow>(`
      SELECT metadata->>'category' AS category,metadata->>'city' AS city,COUNT(*) AS views
      FROM public.marketplace_events
      WHERE event_name='service_city_viewed'
        AND occurred_at >= now() - interval '30 days'
      GROUP BY metadata->>'category',metadata->>'city'
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `),
  ]);

  const totals = totalsResult.rows[0];
  const catalogViews = n(totals?.catalog_views);
  const profileViews = n(totals?.profile_views);
  const landingViews = n(totals?.landing_views);
  const ctaClicks = n(totals?.cta_clicks);
  const discoveryViews = catalogViews + profileViews + landingViews;
  const ctaConversion = discoveryViews > 0 ? Math.round((ctaClicks / discoveryViews) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <Link href="/admin/analytics" className="text-sm font-semibold text-muted-foreground hover:text-primary">← Общая аналитика</Link>
        <p className="mt-5 text-sm font-semibold text-primary">Публичный каталог</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">Поиск и выбор подрядчиков</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Поведение пользователей на публичных страницах за последние 30 дней. IP-адреса и данные устройства в этой аналитике не сохраняются.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Search} label="Просмотры каталога" value={catalogViews} />
        <Metric icon={Building2} label="Просмотры профилей" value={profileViews} />
        <Metric icon={BarChart3} label="Страницы услуга × город" value={landingViews} />
        <Metric icon={MousePointerClick} label="Переходы к проекту" value={ctaClicks} />
        <Metric icon={UsersRound} label="Конверсия в CTA" value={`${ctaConversion}%`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold">Самые просматриваемые подрядчики</h2>
          <p className="mt-1 text-sm text-muted-foreground">Помогает видеть спрос и позже учитывать интерес пользователей в рекомендациях без прямого накручивания рейтинга.</p>
          <div className="mt-5 space-y-3">
            {contractorResult.rows.length === 0 ? <Empty /> : contractorResult.rows.map((row,index)=><div key={row.contractor_id} className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-4 py-3"><div className="min-w-0"><span className="mr-2 text-xs font-bold text-muted-foreground">#{index+1}</span><span className="break-words text-sm font-semibold">{row.public_name}</span></div><strong className="shrink-0">{n(row.views)}</strong></div>)}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-bold">Популярные услуги и города</h2>
          <p className="mt-1 text-sm text-muted-foreground">Фактический спрос на SEO-страницы публичного каталога.</p>
          <div className="mt-5 space-y-3">
            {landingResult.rows.length === 0 ? <Empty /> : landingResult.rows.map((row,index)=><div key={`${row.category}-${row.city}-${index}`} className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-4 py-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{row.category || "Услуга"}</p><p className="break-words text-xs text-muted-foreground">{row.city || "Город не указан"}</p></div><strong className="shrink-0">{n(row.views)}</strong></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({icon:Icon,label,value}:{icon:typeof Search;label:string;value:number|string}){return <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><Icon className="h-5 w-5 text-primary"/><p className="mt-4 text-xs text-muted-foreground">{label}</p><p className="mt-2 break-words text-2xl font-black">{value}</p></article>}
function Empty(){return <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Данных пока недостаточно. Показатели появятся после посещений публичного каталога.</p>}
function n(value:unknown){const parsed=Number(value??0);return Number.isFinite(parsed)?parsed:0}
