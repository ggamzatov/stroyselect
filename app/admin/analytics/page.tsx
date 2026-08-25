import {
  Activity,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  FileCheck2,
  FolderKanban,
  Gavel,
  Handshake,
  MessageSquareText,
  Repeat2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { db } from "@/lib/db/pool";

type FunnelRow = {
  created_projects: string | number;
  published_projects: string | number;
  bid_projects: string | number;
  selected_projects: string | number;
  completed_projects: string | number;
  reviewed_projects: string | number;
};

type ContractorFunnelRow = {
  registered_contractors: string | number;
  company_profiles: string | number;
  verified_contractors: string | number;
  bidding_contractors: string | number;
  selected_contractors: string | number;
  completed_contractors: string | number;
};

type OpsRow = {
  customers: string | number;
  contractors: string | number;
  verified_contractors: string | number;
  total_bids: string | number;
  avg_bids_per_bid_project: string | number | null;
  avg_first_bid_hours: string | number | null;
  dispute_projects: string | number;
  active_projects: string | number;
  repeat_customers: string | number;
  customers_with_projects: string | number;
  retained_contractors: string | number;
  bidding_contractors: string | number;
};

type RecentRow = {
  projects_30d: string | number;
  bids_30d: string | number;
  completed_30d: string | number;
  reviews_30d: string | number;
  new_customers_30d: string | number;
  new_contractors_30d: string | number;
};

export default async function AdminAnalyticsPage() {
  const [funnelResult, contractorFunnelResult, opsResult, recentResult] = await Promise.all([
    db.query<FunnelRow>(`
      SELECT
        COUNT(*) AS created_projects,
        COUNT(*) FILTER (
          WHERE status::text IN (
            'published','collecting_bids','contractor_selected','in_progress','completed','disputed'
          )
        ) AS published_projects,
        COUNT(*) FILTER (
          WHERE EXISTS (SELECT 1 FROM public.project_bids pb WHERE pb.project_id = p.id)
        ) AS bid_projects,
        COUNT(*) FILTER (
          WHERE selected_contractor_id IS NOT NULL
             OR status::text IN ('contractor_selected','in_progress','completed','disputed')
        ) AS selected_projects,
        COUNT(*) FILTER (WHERE status::text = 'completed') AS completed_projects,
        COUNT(*) FILTER (
          WHERE EXISTS (SELECT 1 FROM public.contractor_reviews cr WHERE cr.project_id = p.id)
        ) AS reviewed_projects
      FROM public.projects p
    `),
    db.query<ContractorFunnelRow>(`
      SELECT
        (SELECT COUNT(*) FROM public.profiles WHERE role::text = 'contractor') AS registered_contractors,
        (SELECT COUNT(*) FROM public.contractor_companies) AS company_profiles,
        (SELECT COUNT(*) FROM public.contractor_companies WHERE verification_status::text = 'verified') AS verified_contractors,
        (SELECT COUNT(DISTINCT contractor_id) FROM public.project_bids WHERE status::text <> 'withdrawn') AS bidding_contractors,
        (SELECT COUNT(DISTINCT selected_contractor_id) FROM public.projects WHERE selected_contractor_id IS NOT NULL) AS selected_contractors,
        (SELECT COUNT(DISTINCT selected_contractor_id) FROM public.projects WHERE selected_contractor_id IS NOT NULL AND status::text = 'completed') AS completed_contractors
    `),
    db.query<OpsRow>(`
      WITH bid_stats AS (
        SELECT COUNT(*) AS total_bids, COUNT(DISTINCT project_id) AS bid_projects
        FROM public.project_bids
        WHERE status::text <> 'withdrawn'
      ),
      first_bid AS (
        SELECT p.id,
          EXTRACT(EPOCH FROM (MIN(pb.created_at) - p.created_at)) / 3600.0 AS first_bid_hours
        FROM public.projects p
        JOIN public.project_bids pb ON pb.project_id = p.id
        WHERE pb.status::text <> 'withdrawn'
        GROUP BY p.id, p.created_at
      ),
      customer_activity AS (
        SELECT customer_id, COUNT(*) AS project_count
        FROM public.projects
        GROUP BY customer_id
      ),
      contractor_activity AS (
        SELECT contractor_id, COUNT(DISTINCT project_id) AS project_count
        FROM public.project_bids
        WHERE status::text <> 'withdrawn'
        GROUP BY contractor_id
      )
      SELECT
        (SELECT COUNT(*) FROM public.profiles WHERE role::text = 'customer') AS customers,
        (SELECT COUNT(*) FROM public.profiles WHERE role::text = 'contractor') AS contractors,
        (SELECT COUNT(*) FROM public.contractor_companies WHERE verification_status::text = 'verified') AS verified_contractors,
        bs.total_bids,
        CASE WHEN bs.bid_projects > 0 THEN ROUND(bs.total_bids::numeric / bs.bid_projects::numeric, 2) ELSE 0 END AS avg_bids_per_bid_project,
        (SELECT ROUND(AVG(GREATEST(first_bid_hours, 0))::numeric, 1) FROM first_bid) AS avg_first_bid_hours,
        (SELECT COUNT(DISTINCT project_id) FROM public.project_disputes) AS dispute_projects,
        (SELECT COUNT(*) FROM public.projects WHERE status::text IN ('contractor_selected','in_progress','disputed')) AS active_projects,
        (SELECT COUNT(*) FROM customer_activity WHERE project_count >= 2) AS repeat_customers,
        (SELECT COUNT(*) FROM customer_activity) AS customers_with_projects,
        (SELECT COUNT(*) FROM contractor_activity WHERE project_count >= 2) AS retained_contractors,
        (SELECT COUNT(*) FROM contractor_activity) AS bidding_contractors
      FROM bid_stats bs
    `),
    db.query<RecentRow>(`
      SELECT
        (SELECT COUNT(*) FROM public.projects WHERE created_at >= now() - interval '30 days') AS projects_30d,
        (SELECT COUNT(*) FROM public.project_bids WHERE created_at >= now() - interval '30 days') AS bids_30d,
        (SELECT COUNT(*) FROM public.projects WHERE status::text = 'completed' AND updated_at >= now() - interval '30 days') AS completed_30d,
        (SELECT COUNT(*) FROM public.contractor_reviews WHERE created_at >= now() - interval '30 days') AS reviews_30d,
        (SELECT COUNT(*) FROM public.profiles WHERE role::text = 'customer' AND created_at >= now() - interval '30 days') AS new_customers_30d,
        (SELECT COUNT(*) FROM public.profiles WHERE role::text = 'contractor' AND created_at >= now() - interval '30 days') AS new_contractors_30d
    `),
  ]);

  const funnel = funnelResult.rows[0];
  const contractorFunnel = contractorFunnelResult.rows[0];
  const ops = opsResult.rows[0];
  const recent = recentResult.rows[0];

  const created = n(funnel?.created_projects);
  const published = n(funnel?.published_projects);
  const bidProjects = n(funnel?.bid_projects);
  const selected = n(funnel?.selected_projects);
  const completed = n(funnel?.completed_projects);
  const reviewed = n(funnel?.reviewed_projects);
  const disputes = n(ops?.dispute_projects);

  const customerFunnel = [
    { label: "Созданы", value: created, icon: FolderKanban },
    { label: "Опубликованы", value: published, icon: Activity },
    { label: "Получили предложения", value: bidProjects, icon: MessageSquareText },
    { label: "Подрядчик выбран", value: selected, icon: Handshake },
    { label: "Завершены", value: completed, icon: FileCheck2 },
    { label: "Получили отзыв", value: reviewed, icon: BadgeCheck },
  ];

  const contractorSteps = [
    { label: "Зарегистрированы", value: n(contractorFunnel?.registered_contractors), icon: UsersRound },
    { label: "Создали компанию", value: n(contractorFunnel?.company_profiles), icon: BriefcaseBusiness },
    { label: "Подтверждены", value: n(contractorFunnel?.verified_contractors), icon: ShieldCheck },
    { label: "Отправляли предложения", value: n(contractorFunnel?.bidding_contractors), icon: MessageSquareText },
    { label: "Были выбраны", value: n(contractorFunnel?.selected_contractors), icon: Handshake },
    { label: "Завершили проект", value: n(contractorFunnel?.completed_contractors), icon: FileCheck2 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Аналитика маркетплейса</p>
            <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">Аналитика СтройВыбора</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Полная воронка заказчиков и подрядчиков, конверсии и операционные показатели по фактическим данным платформы.</p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-primary"><BarChart3 className="h-4 w-4" />Данные в реальном времени</div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Заказчики" value={n(ops?.customers)} note={`${percent(n(ops?.repeat_customers), n(ops?.customers_with_projects))}% повторных среди создававших проекты`} icon={UsersRound} />
        <MetricCard title="Подрядчики" value={n(ops?.contractors)} note={`${n(ops?.verified_contractors)} подтверждено`} icon={BadgeCheck} />
        <MetricCard title="Предложения" value={n(ops?.total_bids)} note={`В среднем ${formatDecimal(ops?.avg_bids_per_bid_project)} на проект с откликами`} icon={MessageSquareText} />
        <MetricCard title="Активные проекты" value={n(ops?.active_projects)} note="Выбран подрядчик / в работе / спор" icon={Activity} />
      </section>

      <FunnelSection eyebrow="Воронка заказчика" title="От заявки до отзыва" steps={customerFunnel} />
      <FunnelSection eyebrow="Воронка подрядчика" title="От регистрации до завершённого проекта" steps={contractorSteps} />

      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
        <p className="text-sm font-semibold text-primary">Ключевые конверсии</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Здоровье маркетплейса</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SmallMetric icon={Clock3} label="До первого предложения" value={ops?.avg_first_bid_hours == null ? "—" : `${formatDecimal(ops.avg_first_bid_hours)} ч`} note="Среднее по проектам с откликами" />
          <SmallMetric icon={Handshake} label="Отклик → выбор" value={`${percent(selected, bidProjects)}%`} note="Проекты с выбранным подрядчиком" />
          <SmallMetric icon={FileCheck2} label="Выбор → завершение" value={`${percent(completed, selected)}%`} note="Доля завершённых проектов" />
          <SmallMetric icon={Gavel} label="Проекты со спором" value={`${percent(disputes, Math.max(created, 1))}%`} note={`${disputes} проектов со спором`} />
          <SmallMetric icon={Repeat2} label="Повторные заказчики" value={`${percent(n(ops?.repeat_customers), n(ops?.customers_with_projects))}%`} note={`${n(ops?.repeat_customers)} создали 2+ проекта`} />
          <SmallMetric icon={BriefcaseBusiness} label="Удержание подрядчиков" value={`${percent(n(ops?.retained_contractors), n(ops?.bidding_contractors))}%`} note={`${n(ops?.retained_contractors)} откликались на 2+ проекта`} />
          <SmallMetric icon={BadgeCheck} label="Верификация подрядчиков" value={`${percent(n(ops?.verified_contractors), n(ops?.contractors))}%`} note="От всех зарегистрированных подрядчиков" />
          <SmallMetric icon={MessageSquareText} label="Предложений на проект" value={formatDecimal(ops?.avg_bids_per_bid_project)} note="Среднее среди проектов с откликами" />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold text-primary">Последние 30 дней</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">Текущая активность</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <RecentRow label="Новые заказчики" value={n(recent?.new_customers_30d)} />
          <RecentRow label="Новые подрядчики" value={n(recent?.new_contractors_30d)} />
          <RecentRow label="Новые проекты" value={n(recent?.projects_30d)} />
          <RecentRow label="Новые предложения" value={n(recent?.bids_30d)} />
          <RecentRow label="Завершённые проекты" value={n(recent?.completed_30d)} />
          <RecentRow label="Новые отзывы" value={n(recent?.reviews_30d)} />
        </div>
      </section>
    </div>
  );
}

function FunnelSection({ eyebrow, title, steps }: { eyebrow: string; title: string; steps: Array<{ label: string; value: number; icon: typeof UsersRound }> }) {
  return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7"><p className="text-sm font-semibold text-primary">{eyebrow}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h2><p className="mt-2 text-sm text-muted-foreground">Конверсия каждого шага считается относительно предыдущего.</p><div className="mt-6 grid gap-3 lg:grid-cols-6">{steps.map((step,index)=>{const previous=index===0?step.value:steps[index-1].value;const conversion=index===0?100:percent(step.value,previous);const Icon=step.icon;return <div key={step.label} className="min-w-0 rounded-2xl border border-border bg-background/70 p-4"><div className="flex items-center justify-between gap-2"><Icon className="h-4 w-4 shrink-0 text-primary"/><span className="shrink-0 text-xs font-semibold text-muted-foreground">{conversion}%</span></div><p className="mt-4 text-2xl font-black tracking-tight text-foreground">{step.value}</p><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{step.label}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{width:`${Math.max(2,Math.min(100,conversion))}%`}}/></div></div>})}</div></section>;
}

function MetricCard({ title, value, note, icon: Icon }: { title: string; value: number; note: string; icon: typeof UsersRound }) {
  return <article className="min-w-0 rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center justify-between gap-3"><p className="min-w-0 break-words text-sm font-semibold text-muted-foreground">{title}</p><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-3xl font-black tracking-tight text-foreground">{value}</p><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{note}</p></article>;
}

function SmallMetric({ icon: Icon, label, value, note }: { icon: typeof Clock3; label: string; value: string; note: string }) {
  return <div className="min-w-0 rounded-2xl border border-border bg-background/60 p-4"><Icon className="h-4 w-4 text-primary"/><p className="mt-3 break-words text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 break-words text-2xl font-black text-foreground">{value}</p><p className="mt-1 break-words text-xs text-muted-foreground">{note}</p></div>;
}

function RecentRow({ label, value }: { label: string; value: number }) {
  return <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-4 py-3"><span className="min-w-0 break-words text-sm text-muted-foreground">{label}</span><strong className="shrink-0 text-lg text-foreground">{value}</strong></div>;
}

function n(value: unknown) { const parsed=Number(value??0); return Number.isFinite(parsed)?parsed:0; }
function percent(value:number,base:number){if(base<=0)return 0;return Math.round((value/base)*100)}
function formatDecimal(value:unknown){const parsed=Number(value??0);return Number.isFinite(parsed)?new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(parsed):"0"}
