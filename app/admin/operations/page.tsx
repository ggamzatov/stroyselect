import { Activity, AlarmClock, Handshake, Repeat2, Target, UsersRound } from "lucide-react";

import { db } from "@/lib/db/pool";

type KpiRow = {
  matched_pairs: string | number;
  matched_bid_pairs: string | number;
  total_bids: string | number;
  accepted_bids: string | number;
  customers_with_projects: string | number;
  repeat_customers: string | number;
  verified_contractors: string | number;
  active_bidding_contractors_90d: string | number;
  overdue_tasks: string | number;
  overdue_followups: string | number;
  open_projects_without_bid_48h: string | number;
};

type EventRow = { event_name: string; total: string | number; latest_at: string | Date | null };

export default async function AdminOperationsPage() {
  const [kpiResult, eventsResult] = await Promise.all([
    db.query<KpiRow>(`
      WITH matched AS (
        SELECT DISTINCT project_id,contractor_id FROM public.project_match_snapshots
      ),
      matched_bids AS (
        SELECT DISTINCT m.project_id,m.contractor_id
        FROM matched m JOIN public.project_bids pb
          ON pb.project_id=m.project_id AND pb.contractor_id=m.contractor_id
      ),
      customer_projects AS (
        SELECT customer_id,COUNT(*) AS cnt FROM public.projects GROUP BY customer_id
      )
      SELECT
        (SELECT COUNT(*) FROM matched) AS matched_pairs,
        (SELECT COUNT(*) FROM matched_bids) AS matched_bid_pairs,
        (SELECT COUNT(*) FROM public.project_bids) AS total_bids,
        (SELECT COUNT(*) FROM public.project_bids WHERE status::text='accepted') AS accepted_bids,
        (SELECT COUNT(*) FROM customer_projects) AS customers_with_projects,
        (SELECT COUNT(*) FROM customer_projects WHERE cnt>1) AS repeat_customers,
        (SELECT COUNT(*) FROM public.contractor_companies WHERE verification_status::text='verified') AS verified_contractors,
        (SELECT COUNT(DISTINCT contractor_id) FROM public.project_bids WHERE created_at>=now()-interval '90 days') AS active_bidding_contractors_90d,
        (SELECT COUNT(*) FROM public.project_advisor_tasks WHERE is_completed=false AND due_at<now()) AS overdue_tasks,
        (SELECT COUNT(*) FROM public.project_candidate_crm WHERE next_follow_up_at<now() AND stage<>'archived') AS overdue_followups,
        (SELECT COUNT(*) FROM public.projects p
         WHERE p.status::text IN ('published','collecting_bids')
           AND p.created_at<now()-interval '48 hours'
           AND NOT EXISTS(SELECT 1 FROM public.project_bids pb WHERE pb.project_id=p.id)) AS open_projects_without_bid_48h
    `),
    db.query<EventRow>(`
      SELECT event_name,COUNT(*) AS total,MAX(occurred_at) AS latest_at
      FROM public.marketplace_events
      WHERE occurred_at>=now()-interval '30 days'
      GROUP BY event_name ORDER BY total DESC,event_name
    `),
  ]);
  const kpi = kpiResult.rows[0];
  const matched = n(kpi?.matched_pairs);
  const matchedBid = n(kpi?.matched_bid_pairs);
  const bids = n(kpi?.total_bids);
  const accepted = n(kpi?.accepted_bids);
  const customers = n(kpi?.customers_with_projects);
  const repeats = n(kpi?.repeat_customers);
  const verified = n(kpi?.verified_contractors);
  const activeContractors = n(kpi?.active_bidding_contractors_90d);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8"><p className="text-sm font-semibold text-primary">Public V1 Operations</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">Операционный центр marketplace</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Контроль качества подбора, конверсии в найм, повторных заказчиков, активности подрядчиков и просроченных действий.</p></section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Target} label="Match → предложение" value={`${percent(matchedBid,matched)}%`} note={`${matchedBid} из ${matched} сохранённых пар matching`} />
        <Metric icon={Handshake} label="Предложение → найм" value={`${percent(accepted,bids)}%`} note={`${accepted} принятых из ${bids} предложений`} />
        <Metric icon={Repeat2} label="Повторные заказчики" value={`${percent(repeats,customers)}%`} note={`${repeats} клиентов создали больше одного проекта`} />
        <Metric icon={UsersRound} label="Активность подрядчиков" value={`${percent(activeContractors,verified)}%`} note={`${activeContractors} verified-подрядчиков подавали bid за 90 дней`} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Attention label="Просроченные задачи" value={n(kpi?.overdue_tasks)} note="Advisor tasks с истёкшим due_at" />
        <Attention label="Просроченные follow-up" value={n(kpi?.overdue_followups)} note="Кандидаты, которым нужен следующий контакт" />
        <Attention label="Без предложения >48 ч" value={n(kpi?.open_projects_without_bid_48h)} note="Опубликованные проекты без единого bid" />
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">События за 30 дней</h2></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{eventsResult.rows.length ? eventsResult.rows.map((event) => <div key={event.event_name} className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{event.event_name}</p><p className="mt-2 text-2xl font-black">{n(event.total)}</p><p className="mt-1 text-xs text-muted-foreground">Последнее: {event.latest_at ? new Intl.DateTimeFormat("ru-RU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.latest_at)) : "—"}</p></div>) : <p className="text-sm text-muted-foreground">Новые события появятся после запуска событийного ledger.</p>}</div></section>
    </div>
  );
}

function Metric({ icon: Icon,label,value,note }: { icon: typeof Target; label:string; value:string; note:string }) { return <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><Icon className="h-5 w-5 text-primary" /><p className="mt-4 text-sm font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black">{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p></article>; }
function Attention({ label,value,note }: { label:string; value:number; note:string }) { return <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center justify-between gap-3"><AlarmClock className="h-5 w-5 text-primary" /><strong className="text-3xl">{value}</strong></div><p className="mt-3 font-bold">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p></article>; }
function n(value: unknown) { const number=Number(value??0); return Number.isFinite(number)?number:0; }
function percent(value:number,base:number) { return base>0?Math.round((value/base)*100):0; }
