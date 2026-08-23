import Link from "next/link";
import { AlertTriangle, BadgeCheck, Building2, Database, GitCompareArrows, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db/pool";
import { resolveContractorEntityMatch } from "@/features/admin/actions/resolve-contractor-entity-match";

type MatchRow={id:string;match_type:string;match_value:string;created_at:Date|string;a_id:string;a_name:string;a_legal:string|null;a_inn:string|null;a_ogrn:string|null;a_status:string;b_id:string;b_name:string;b_legal:string|null;b_inn:string|null;b_ogrn:string|null;b_status:string};
type CountRow={open_matches:string|number;profile_changes:string|number;registry_checks:string|number;registry_mismatches:string|number};

export default async function AdminDataQualityPage(){
 const [matchesResult,countResult]=await Promise.all([
  db.query<MatchRow>(`
   SELECT m.id,m.match_type,m.match_value,m.created_at,
          a.id AS a_id,a.public_name AS a_name,a.legal_name AS a_legal,a.inn AS a_inn,a.ogrn AS a_ogrn,a.verification_status::text AS a_status,
          b.id AS b_id,b.public_name AS b_name,b.legal_name AS b_legal,b.inn AS b_inn,b.ogrn AS b_ogrn,b.verification_status::text AS b_status
   FROM public.contractor_entity_matches m
   JOIN public.contractor_companies a ON a.id=m.contractor_a_id
   JOIN public.contractor_companies b ON b.id=m.contractor_b_id
   WHERE m.status='open'
   ORDER BY m.created_at DESC
   LIMIT 100
  `),
  db.query<CountRow>(`
   SELECT
    (SELECT count(*) FROM public.contractor_entity_matches WHERE status='open') AS open_matches,
    (SELECT count(*) FROM public.contractor_profile_history) AS profile_changes,
    (SELECT count(*) FROM public.contractor_registry_checks) AS registry_checks,
    (SELECT count(*) FROM public.contractor_registry_checks WHERE status='mismatch') AS registry_mismatches
  `)
 ]);
 const counts=countResult.rows[0];
 return <div className="space-y-6">
  <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8"><div className="flex min-w-0 items-start justify-between gap-5"><div className="min-w-0"><p className="text-sm font-semibold text-primary">Качество данных</p><h1 className="mt-2 break-words text-3xl font-black tracking-[-0.04em] md:text-4xl">Компании и дубликаты</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Контроль совпадений по ИНН/ОГРН, история изменения реквизитов и результаты внешних проверок. Совпадения не объединяются автоматически.</p></div><Database className="h-10 w-10 shrink-0 text-primary"/></div></section>
  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<GitCompareArrows/>} label="Открытые совпадения" value={num(counts?.open_matches)}/><Metric icon={<Building2/>} label="Изменения профилей" value={num(counts?.profile_changes)}/><Metric icon={<ShieldCheck/>} label="Проверки реестров" value={num(counts?.registry_checks)}/><Metric icon={<AlertTriangle/>} label="Расхождения реестров" value={num(counts?.registry_mismatches)}/></section>
  <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Дедупликация</p><h2 className="mt-1 text-xl font-black">Требуют решения</h2></div><span className="text-sm text-muted-foreground">{matchesResult.rows.length} показано</span></div>
   <div className="mt-5 space-y-4">{matchesResult.rows.length===0?<div className="rounded-2xl border border-dashed border-border p-8 text-center"><BadgeCheck className="mx-auto h-6 w-6 text-emerald-600"/><p className="mt-3 font-bold">Открытых совпадений нет</p><p className="mt-1 text-sm text-muted-foreground">Новые совпадения будут появляться автоматически при сохранении реквизитов.</p></div>:matchesResult.rows.map(match=><article key={match.id} className="rounded-2xl border border-border p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Совпадение {match.match_type==="inn"?"ИНН":"ОГРН"}</span><code className="rounded-lg bg-secondary px-2 py-1 text-xs">{match.match_value}</code></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><CompanyCard id={match.a_id} name={match.a_name} legal={match.a_legal} inn={match.a_inn} ogrn={match.a_ogrn} status={match.a_status}/><CompanyCard id={match.b_id} name={match.b_name} legal={match.b_legal} inn={match.b_inn} ogrn={match.b_ogrn} status={match.b_status}/></div><form action={async(formData)=>{"use server";await resolveContractorEntityMatch({id:match.id,decision:String(formData.get("decision")) as "same_entity"|"not_duplicate",note:String(formData.get("note")??"")})}} className="mt-4 flex flex-col gap-3 rounded-xl bg-secondary/35 p-4 md:flex-row md:items-end"><label className="min-w-0 flex-1 text-xs font-semibold text-muted-foreground">Комментарий<input name="note" className="mt-1 min-h-10 w-full rounded-xl border bg-background px-3 text-sm text-foreground" placeholder="Почему принято такое решение"/></label><button name="decision" value="same_entity" className="min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Одна компания</button><button name="decision" value="not_duplicate" className="min-h-10 rounded-xl border border-border bg-background px-4 text-sm font-bold">Не дубль</button></form></article>)}</div>
  </section>
 </div>;
}
function CompanyCard({id,name,legal,inn,ogrn,status}:{id:string;name:string;legal:string|null;inn:string|null;ogrn:string|null;status:string}){return <div className="min-w-0 rounded-xl border border-border bg-background p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-bold">{name}</p>{legal&&<p className="mt-1 break-words text-xs text-muted-foreground">{legal}</p>}</div><span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold">{statusLabel(status)}</span></div><dl className="mt-3 grid gap-2 text-xs"><div><dt className="text-muted-foreground">ИНН</dt><dd className="font-semibold">{inn||"—"}</dd></div><div><dt className="text-muted-foreground">ОГРН/ОГРНИП</dt><dd className="font-semibold">{ogrn||"—"}</dd></div></dl><Link href={`/admin/contractors/${id}`} className="mt-3 inline-flex text-xs font-bold text-primary">Открыть профиль →</Link></div>}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="text-primary">{icon}</div><p className="mt-4 text-xs text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>}
function num(v:unknown){const n=Number(v??0);return Number.isFinite(n)?n:0}
function statusLabel(v:string){return v==="verified"?"Подтверждён":v==="pending"?"На проверке":v==="rejected"?"Отклонён":v==="suspended"?"Приостановлен":"Черновик"}
