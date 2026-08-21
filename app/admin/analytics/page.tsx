import {
  Activity,
  BadgeCheck,
  BarChart3,
  Clock3,
  FileCheck2,
  FolderKanban,
  Gavel,
  Handshake,
  MessageSquareText,
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

type OpsRow = {
  customers: string | number;
  contractors: string | number;
  verified_contractors: string | number;
  total_bids: string | number;
  avg_bids_per_bid_project: string | number | null;
  avg_first_bid_hours: string | number | null;
  dispute_projects: string | number;
  active_projects: string | number;
};

type RecentRow = {
  projects_30d: string | number;
  bids_30d: string | number;
  completed_30d: string | number;
  reviews_30d: string | number;
};

export default async function AdminAnalyticsPage() {
  const [funnelResult, opsResult, recentResult] = await Promise.all([
    db.query<FunnelRow>(`
      SELECT
        COUNT(*) AS created_projects,
        COUNT(*) FILTER (
          WHERE status::text IN (
            'published','collecting_bids','contractor_selected','in_progress','completed','disputed'
          )
        ) AS published_projects,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM public.project_bids pb WHERE pb.project_id = p.id
          )
        ) AS bid_projects,
        COUNT(*) FILTER (
          WHERE selected_contractor_id IS NOT NULL
             OR status::text IN ('contractor_selected','in_progress','completed','disputed')
        ) AS selected_projects,
        COUNT(*) FILTER (WHERE status::text = 'completed') AS completed_projects,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM public.contractor_reviews cr WHERE cr.project_id = p.id
          )
        ) AS reviewed_projects
      FROM public.projects p
    `),
    db.query<OpsRow>(`
      WITH bid_stats AS (
        SELECT
          COUNT(*) AS total_bids,
          COUNT(DISTINCT project_id) AS bid_projects
        FROM public.project_bids
      ),
      first_bid AS (
        SELECT
          p.id,
          EXTRACT(EPOCH FROM (MIN(pb.created_at) - p.created_at)) / 3600.0 AS first_bid_hours
        FROM public.projects p
        JOIN public.project_bids pb ON pb.project_id = p.id
        GROUP BY p.id, p.created_at
      )
      SELECT
        (SELECT COUNT(*) FROM public.profiles WHERE role::text = 'customer') AS customers,
        (SELECT COUNT(*) FROM public.profiles WHERE role::text = 'contractor') AS contractors,
        (SELECT COUNT(*) FROM public.contractor_companies WHERE verification_status::text = 'verified') AS verified_contractors,
        bs.total_bids,
        CASE WHEN bs.bid_projects > 0
          THEN ROUND(bs.total_bids::numeric / bs.bid_projects::numeric, 2)
          ELSE 0
        END AS avg_bids_per_bid_project,
        (SELECT ROUND(AVG(GREATEST(first_bid_hours, 0))::numeric, 1) FROM first_bid) AS avg_first_bid_hours,
        (SELECT COUNT(DISTINCT project_id) FROM public.project_disputes) AS dispute_projects,
        (SELECT COUNT(*) FROM public.projects WHERE status::text IN ('contractor_selected','in_progress','disputed')) AS active_projects
      FROM bid_stats bs
    `),
    db.query<RecentRow>(`
      SELECT
        (SELECT COUNT(*) FROM public.projects WHERE created_at >= now() - interval '30 days') AS projects_30d,
        (SELECT COUNT(*) FROM public.project_bids WHERE created_at >= now() - interval '30 days') AS bids_30d,
        (SELECT COUNT(*) FROM public.projects WHERE status::text = 'completed' AND updated_at >= now() - interval '30 days') AS completed_30d,
        (SELECT COUNT(*) FROM public.contractor_reviews WHERE created_at >= now() - interval '30 days') AS reviews_30d
    `),
  ]);

  const funnel = funnelResult.rows[0];
  const ops = opsResult.rows[0];
  const recent = recentResult.rows[0];

  const created = n(funnel?.created_projects);
  const published = n(funnel?.published_projects);
  const bidProjects = n(funnel?.bid_projects);
  const selected = n(funnel?.selected_projects);
  const completed = n(funnel?.completed_projects);
  const reviewed = n(funnel?.reviewed_projects);
  const disputes = n(ops?.dispute_projects);

  const funnelSteps = [
    { label: "Созданы", value: created, icon: FolderKanban },
    { label: "Опубликованы", value: published, icon: Activity },
    { label: "Получили предложения", value: bidProjects, icon: MessageSquareText },
    { label: "Подрядчик выбран", value: selected, icon: Handshake },
    { label: "Завершены", value: completed, icon: FileCheck2 },
    { label: "Получили отзыв", value: reviewed, icon: BadgeCheck },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Marketplace intelligence</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
              Аналитика СтройВыбора
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Воронка заказчика, активность подрядчиков и операционные показатели на основе фактических данных платформы.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-primary">
            <BarChart3 className="h-4 w-4" />
            Данные в реальном времени
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Заказчики" value={n(ops?.customers)} note="Зарегистрированные аккаунты" icon={UsersRound} />
        <MetricCard title="Подрядчики" value={n(ops?.contractors)} note={`${n(ops?.verified_contractors)} подтверждено`} icon={BadgeCheck} />
        <MetricCard title="Предложения" value={n(ops?.total_bids)} note={`В среднем ${formatDecimal(ops?.avg_bids_per_bid_project)} на проект с откликами`} icon={MessageSquareText} />
        <MetricCard title="Активные проекты" value={n(ops?.active_projects)} note="Выбран подрядчик / в работе / спор" icon={Activity} />
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
        <div>
          <p className="text-sm font-semibold text-primary">Customer funnel</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Воронка проекта</h2>
          <p className="mt-2 text-sm text-muted-foreground">Конверсии считаются от предыдущего этапа.</p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-6">
          {funnelSteps.map((step, index) => {
            const previous = index === 0 ? step.value : funnelSteps[index - 1].value;
            const conversion = index === 0 ? 100 : percent(step.value, previous);
            const Icon = step.icon;
            return (
              <div key={step.label} className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">{conversion}%</span>
                </div>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{step.value}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.label}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.min(100, conversion))}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold text-primary">Операционные метрики</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Качество marketplace</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SmallMetric
              icon={Clock3}
              label="До первого предложения"
              value={ops?.avg_first_bid_hours == null ? "—" : `${formatDecimal(ops.avg_first_bid_hours)} ч`}
              note="Среднее по проектам с откликами"
            />
            <SmallMetric
              icon={Gavel}
              label="Доля проектов со спорами"
              value={`${percent(disputes, created)}%`}
              note={`${disputes} проектов со спором`}
            />
            <SmallMetric
              icon={Handshake}
              label="Выбор подрядчика"
              value={`${percent(selected, bidProjects)}%`}
              note="От проектов с предложениями"
            />
            <SmallMetric
              icon={FileCheck2}
              label="Завершение"
              value={`${percent(completed, selected)}%`}
              note="От проектов с выбранным подрядчиком"
            />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold text-primary">Последние 30 дней</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Текущая активность</h2>
          <div className="mt-5 space-y-3">
            <RecentRow label="Новые проекты" value={n(recent?.projects_30d)} />
            <RecentRow label="Новые предложения" value={n(recent?.bids_30d)} />
            <RecentRow label="Завершённые проекты" value={n(recent?.completed_30d)} />
            <RecentRow label="Новые отзывы" value={n(recent?.reviews_30d)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ title, value, note, icon: Icon }: { title: string; value: number; note: string; icon: typeof UsersRound }) {
  return (
    <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </article>
  );
}

function SmallMetric({ icon: Icon, label, value, note }: { icon: typeof Clock3; label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function RecentRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="text-lg text-foreground">{value}</strong>
    </div>
  );
}

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value: number, base: number) {
  if (base <= 0) return 0;
  return Math.round((value / base) * 100);
}

function formatDecimal(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(parsed) : "0";
}
