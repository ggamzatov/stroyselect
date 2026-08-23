import Link from "next/link";
import { BarChart3, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";

import { db } from "@/lib/db/pool";

type ScoreRow = {
  contractor_id: string;
  public_name: string;
  raw_score: number | string;
  stroyselect_score: number | string;
  confidence_percent: number | string;
  confidence_level: string;
  confidence_explanation: string;
  review_count: number;
  completed_projects_count: number;
  bid_count: number;
};

type HistoryRow = {
  id: string;
  contractor_id: string;
  public_name: string;
  raw_score: number;
  stroyselect_score: number;
  confidence_percent: number;
  confidence_level: string;
  created_at: Date | string;
};

export default async function AdminScorePage() {
  const [scoresResult, historyResult] = await Promise.all([
    db.query<ScoreRow>(`
      SELECT
        s.contractor_id,
        cc.public_name,
        s.raw_score,
        s.stroyselect_score,
        s.confidence_percent,
        s.confidence_level,
        s.confidence_explanation,
        s.review_count,
        s.completed_projects_count,
        s.bid_count
      FROM public.contractor_score_maturity s
      JOIN public.contractor_companies cc ON cc.id=s.contractor_id
      ORDER BY s.confidence_percent ASC, s.raw_score DESC, cc.public_name ASC
      LIMIT 200
    `),
    db.query<HistoryRow>(`
      SELECT h.id,h.contractor_id,cc.public_name,h.raw_score,h.stroyselect_score,h.confidence_percent,h.confidence_level,h.created_at
      FROM public.contractor_score_history h
      JOIN public.contractor_companies cc ON cc.id=h.contractor_id
      ORDER BY h.created_at DESC
      LIMIT 40
    `),
  ]);

  const scores=scoresResult.rows;
  const low=scores.filter((row)=>row.confidence_level==="low").length;
  const limited=scores.filter((row)=>n(row.raw_score)>n(row.stroyselect_score)).length;
  const high=scores.filter((row)=>row.confidence_level==="high").length;

  return <div className="space-y-6">
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
      <p className="text-sm font-semibold text-primary">Контроль качества подрядчиков</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">StroySelect Score V2</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Score учитывает не только заполненность профиля, но и достоверность накопленных данных. При малом объёме подтверждённых проектов, отзывов и предложений итоговый рейтинг ограничивается confidence-cap.</p>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Всего подрядчиков" value={scores.length} icon={UsersRound}/>
      <Metric title="Высокая достоверность" value={high} icon={ShieldCheck}/>
      <Metric title="Мало данных" value={low} icon={BarChart3}/>
      <Metric title="Score ограничен" value={limited} icon={TrendingUp}/>
    </section>

    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold text-primary">Текущая оценка</p><h2 className="mt-1 text-2xl font-bold">Подрядчики и достоверность</h2></div><p className="text-xs text-muted-foreground">Сначала показаны профили с наименьшей достоверностью.</p></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="px-3 py-3">Подрядчик</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Сырой score</th><th className="px-3 py-3">Достоверность</th><th className="px-3 py-3">Отзывы</th><th className="px-3 py-3">Проекты</th><th className="px-3 py-3">Предложения</th></tr></thead><tbody>{scores.map((row)=><tr key={row.contractor_id} className="border-b border-border/70 last:border-0"><td className="px-3 py-4"><Link href={`/admin/contractors/${row.contractor_id}`} className="font-semibold text-primary hover:underline">{row.public_name}</Link><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{row.confidence_explanation}</p></td><td className="px-3 py-4 text-lg font-black">{n(row.stroyselect_score)}</td><td className="px-3 py-4">{n(row.raw_score)}</td><td className="px-3 py-4"><span className="font-semibold">{n(row.confidence_percent)}%</span><p className="mt-1 text-xs text-muted-foreground">{confidenceLabel(row.confidence_level)}</p></td><td className="px-3 py-4">{row.review_count}</td><td className="px-3 py-4">{row.completed_projects_count}</td><td className="px-3 py-4">{row.bid_count}</td></tr>)}</tbody></table></div>
    </section>

    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <p className="text-sm font-semibold text-primary">Аудит изменений</p><h2 className="mt-1 text-2xl font-bold">Последние изменения Score</h2>
      {historyResult.rows.length===0?<p className="mt-5 text-sm text-muted-foreground">История появится после применения миграции и первых изменений данных подрядчиков.</p>:<div className="mt-5 space-y-3">{historyResult.rows.map((row)=><article key={row.id} className="grid gap-3 rounded-2xl border border-border bg-background/60 p-4 md:grid-cols-[minmax(0,1fr)_100px_100px_140px_180px] md:items-center"><Link href={`/admin/contractors/${row.contractor_id}`} className="min-w-0 break-words font-semibold text-primary hover:underline">{row.public_name}</Link><div><p className="text-xs text-muted-foreground">Score</p><p className="font-black">{row.stroyselect_score}</p></div><div><p className="text-xs text-muted-foreground">Сырой</p><p className="font-semibold">{row.raw_score}</p></div><div><p className="text-xs text-muted-foreground">Достоверность</p><p className="font-semibold">{row.confidence_percent}% · {confidenceLabel(row.confidence_level)}</p></div><time className="text-xs text-muted-foreground">{formatDate(row.created_at)}</time></article>)}</div>}
    </section>
  </div>;
}

function Metric({title,value,icon:Icon}:{title:string;value:number;icon:typeof UsersRound}){return <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{title}</p><Icon className="h-5 w-5 text-primary"/></div><p className="mt-4 text-3xl font-black tracking-tight">{value}</p></div>}
function n(value:unknown){const number=Number(value);return Number.isFinite(number)?Math.round(number):0}
function confidenceLabel(value:string){return value==="high"?"Высокая":value==="medium"?"Средняя":"Низкая"}
function formatDate(value:Date|string){return new Intl.DateTimeFormat("ru-RU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}
