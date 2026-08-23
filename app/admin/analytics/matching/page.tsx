import { Activity, BarChart3, CheckCircle2, Gavel, Handshake, MessageSquareText, Star, Target, UsersRound } from "lucide-react";

import { db } from "@/lib/db/pool";

type SummaryRow = {
  observations: number | string;
  projects: number | string;
  contractors: number | string;
  invited: number | string;
  bids: number | string;
  selected: number | string;
  completed: number | string;
  reviewed: number | string;
  disputed: number | string;
  avg_selected_score: number | string | null;
  avg_not_selected_score: number | string | null;
};

type BucketRow = {
  bucket: string;
  bucket_order: number | string;
  observations: number | string;
  invited: number | string;
  bids: number | string;
  selected: number | string;
  completed: number | string;
  reviewed: number | string;
  disputed: number | string;
  avg_review_rating: number | string | null;
};

type ComponentRow = {
  component: string;
  selected_avg: number | string | null;
  not_selected_avg: number | string | null;
};

const componentLabels: Record<string, string> = {
  category: "Категория",
  primaryService: "Основная специализация",
  geography: "География",
  budget: "Бюджет",
  relevantExperience: "Опыт в категории",
  propertyExperience: "Опыт на типе объекта",
  stroyselectScore: "Рейтинг СтройВыбор",
  rating: "Отзывы",
  response: "Доля ответов",
  completion: "Завершение проектов",
  disputeFree: "Работа без споров",
  bidWin: "Успешность предложений",
  deadline: "Соблюдение сроков",
  responseSpeed: "Скорость ответа",
};

export default async function MatchingAnalyticsPage() {
  const [summaryResult, bucketsResult, componentsResult] = await Promise.all([
    db.query<SummaryRow>(`
      SELECT
        COUNT(*) AS observations,
        COUNT(DISTINCT project_id) AS projects,
        COUNT(DISTINCT contractor_id) AS contractors,
        COUNT(*) FILTER (WHERE was_invited) AS invited,
        COUNT(*) FILTER (WHERE submitted_bid) AS bids,
        COUNT(*) FILTER (WHERE was_selected) AS selected,
        COUNT(*) FILTER (WHERE project_completed) AS completed,
        COUNT(*) FILTER (WHERE received_review) AS reviewed,
        COUNT(*) FILTER (WHERE had_dispute) AS disputed,
        ROUND(AVG(match_score) FILTER (WHERE was_selected), 1) AS avg_selected_score,
        ROUND(AVG(match_score) FILTER (WHERE NOT was_selected), 1) AS avg_not_selected_score
      FROM public.matching_feedback_outcomes
      WHERE source_version = 'matching-v3'
    `),
    db.query<BucketRow>(`
      WITH bucketed AS (
        SELECT *,
          CASE
            WHEN match_score >= 90 THEN '90–100%'
            WHEN match_score >= 80 THEN '80–89%'
            WHEN match_score >= 70 THEN '70–79%'
            WHEN match_score >= 60 THEN '60–69%'
            ELSE 'до 60%'
          END AS bucket,
          CASE
            WHEN match_score >= 90 THEN 5
            WHEN match_score >= 80 THEN 4
            WHEN match_score >= 70 THEN 3
            WHEN match_score >= 60 THEN 2
            ELSE 1
          END AS bucket_order
        FROM public.matching_feedback_outcomes
        WHERE source_version = 'matching-v3'
      )
      SELECT
        bucket,
        bucket_order,
        COUNT(*) AS observations,
        COUNT(*) FILTER (WHERE was_invited) AS invited,
        COUNT(*) FILTER (WHERE submitted_bid) AS bids,
        COUNT(*) FILTER (WHERE was_selected) AS selected,
        COUNT(*) FILTER (WHERE project_completed) AS completed,
        COUNT(*) FILTER (WHERE received_review) AS reviewed,
        COUNT(*) FILTER (WHERE had_dispute) AS disputed,
        ROUND(AVG(review_rating) FILTER (WHERE review_rating IS NOT NULL), 2) AS avg_review_rating
      FROM bucketed
      GROUP BY bucket, bucket_order
      ORDER BY bucket_order DESC
    `),
    db.query<ComponentRow>(`
      WITH expanded AS (
        SELECT
          o.was_selected,
          item.key AS component,
          CASE
            WHEN item.value ~ '^-?[0-9]+([.][0-9]+)?$' THEN item.value::numeric
            ELSE NULL
          END AS component_value
        FROM public.matching_feedback_outcomes o
        CROSS JOIN LATERAL jsonb_each_text(o.components) item
        WHERE o.source_version = 'matching-v3'
      )
      SELECT
        component,
        ROUND(AVG(component_value) FILTER (WHERE was_selected), 2) AS selected_avg,
        ROUND(AVG(component_value) FILTER (WHERE NOT was_selected), 2) AS not_selected_avg
      FROM expanded
      WHERE component_value IS NOT NULL
      GROUP BY component
      ORDER BY component
    `),
  ]);

  const summary = summaryResult.rows[0];
  const observations = n(summary?.observations);
  const selected = n(summary?.selected);
  const completed = n(summary?.completed);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Контроль алгоритма подбора</p>
            <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">Качество Matching V3</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Система сопоставляет неизменяемый score, который заказчик увидел до исхода проекта, с реальными действиями: приглашением, предложением, выбором, завершением, отзывом и спором.</p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-primary"><Target className="h-4 w-4" />Версия matching-v3</div>
        </div>
      </section>

      {observations < 100 && (
        <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Пока накоплено {observations} наблюдений. Для изменения весов алгоритма лучше дождаться как минимум 100–200 наблюдений и нескольких десятков завершённых проектов. Сейчас данные следует использовать как диагностические, а не как основание для автоматической перенастройки.
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={BarChart3} title="Наблюдения" value={observations} note={`${n(summary?.projects)} проектов · ${n(summary?.contractors)} подрядчиков`} />
        <Metric icon={Handshake} title="Выбраны" value={selected} note={`${percent(selected, observations)}% от показанных совпадений`} />
        <Metric icon={CheckCircle2} title="Завершены" value={completed} note={`${percent(completed, selected)}% среди выбранных`} />
        <Metric icon={Gavel} title="Со спором" value={n(summary?.disputed)} note={`${percent(n(summary?.disputed), selected)}% среди выбранных`} />
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div><p className="text-sm font-semibold text-primary">Исходы по диапазонам</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Как ведут себя разные уровни совпадения</h2></div>
          <p className="text-xs text-muted-foreground">Чем выше score, тем ожидаемо выше должны быть приглашение, выбор и успешное завершение.</p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[880px] border-separate border-spacing-y-2 text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="px-3 py-2">Score</th><th className="px-3 py-2">Показов</th><th className="px-3 py-2">Приглашены</th><th className="px-3 py-2">Предложение</th><th className="px-3 py-2">Выбраны</th><th className="px-3 py-2">Завершили</th><th className="px-3 py-2">Отзывы</th><th className="px-3 py-2">Споры</th><th className="px-3 py-2">Оценка</th></tr></thead>
            <tbody>{bucketsResult.rows.map((row) => { const total=n(row.observations); const rowSelected=n(row.selected); return <tr key={row.bucket} className="bg-background/70"><td className="rounded-l-xl px-3 py-3 font-black text-primary">{row.bucket}</td><td className="px-3 py-3">{total}</td><RateCell value={n(row.invited)} total={total}/><RateCell value={n(row.bids)} total={total}/><RateCell value={rowSelected} total={total}/><RateCell value={n(row.completed)} total={rowSelected}/><RateCell value={n(row.reviewed)} total={Math.max(n(row.completed),1)}/><RateCell value={n(row.disputed)} total={Math.max(rowSelected,1)}/><td className="rounded-r-xl px-3 py-3 font-semibold">{row.avg_review_rating == null ? "—" : `${decimal(row.avg_review_rating)} / 5`}</td></tr>; })}</tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold text-primary">Факторы выбора</p><h2 className="mt-1 text-xl font-bold">Средний вклад компонентов</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Сравнение score-компонентов у подрядчиков, которых заказчики реально выбрали, и у остальных показанных кандидатов.</p>
          <div className="mt-5 space-y-2">{componentsResult.rows.map((row) => { const selectedAvg=decimalNumber(row.selected_avg); const otherAvg=decimalNumber(row.not_selected_avg); const delta=selectedAvg-otherAvg; return <div key={row.component} className="grid grid-cols-[minmax(0,1fr)_72px_72px_72px] items-center gap-2 rounded-xl bg-background/70 px-3 py-3 text-xs"><span className="min-w-0 break-words font-semibold">{componentLabels[row.component] ?? row.component}</span><span className="text-right text-muted-foreground">{selectedAvg.toFixed(1)}</span><span className="text-right text-muted-foreground">{otherAvg.toFixed(1)}</span><span className={["text-right font-black",delta>0?"text-emerald-700":delta<0?"text-rose-700":"text-muted-foreground"].join(" ")}>{delta>0?"+":""}{delta.toFixed(1)}</span></div>; })}</div>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_72px_72px_72px] gap-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><span>Фактор</span><span className="text-right">Выбраны</span><span className="text-right">Остальные</span><span className="text-right">Разница</span></div>
        </div>
        <div className="space-y-4">
          <Metric icon={MessageSquareText} title="Получили предложение" value={n(summary?.bids)} note={`${percent(n(summary?.bids), observations)}% от наблюдений`} />
          <Metric icon={Star} title="Получили отзыв" value={n(summary?.reviewed)} note={`${percent(n(summary?.reviewed), Math.max(completed,1))}% от завершённых`} />
          <Metric icon={Activity} title="Средний score выбранных" value={summary?.avg_selected_score == null ? "—" : decimal(summary.avg_selected_score)} note={`Остальные: ${summary?.avg_not_selected_score == null ? "—" : decimal(summary.avg_not_selected_score)}`} />
          <Metric icon={UsersRound} title="Приглашены" value={n(summary?.invited)} note={`${percent(n(summary?.invited), observations)}% от показанных`} />
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, title, value, note }: { icon: typeof BarChart3; title: string; value: string | number; note: string }) {
  return <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center gap-2 text-primary"><Icon className="h-4 w-4"/><span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</span></div><p className="mt-3 text-3xl font-black tracking-tight">{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p></div>;
}

function RateCell({ value, total }: { value: number; total: number }) { return <td className="px-3 py-3"><strong>{value}</strong><span className="ml-1 text-xs text-muted-foreground">({percent(value,total)}%)</span></td>; }
function n(value: unknown) { const parsed=Number(value); return Number.isFinite(parsed)?parsed:0; }
function decimalNumber(value: unknown) { const parsed=Number(value); return Number.isFinite(parsed)?parsed:0; }
function decimal(value: unknown) { return decimalNumber(value).toLocaleString("ru-RU",{maximumFractionDigits:2}); }
function percent(value:number,total:number) { if(total<=0)return 0; return Math.round((value/total)*100); }
