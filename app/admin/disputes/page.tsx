import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { getAdminDisputes } from "@/features/admin/queries/get-admin-disputes";

export default async function AdminDisputesPage(){
  const disputes=await getAdminDisputes();
  return <div className="space-y-6">
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-4"><div className="rounded-2xl bg-red-50 p-3 text-red-700"><ShieldAlert className="h-6 w-6"/></div><div><p className="text-sm font-semibold text-primary">Risk Operations</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">Споры и риски</h1><p className="mt-2 text-sm text-muted-foreground">Очередь спорных проектов, автоматические risk signals и ручная модерация.</p></div></div>
    </section>
    <div className="space-y-3">{disputes.length===0?<div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Активных споров пока нет.</div>:disputes.map(d=>{
      const changeRatio=d.original_contract>0?Math.round(d.approved_change_increase/d.original_contract*100):0;
      return <Link key={d.id} href={`/admin/disputes/${d.id}`} className="block rounded-[1.5rem] border border-border bg-card p-5 transition hover:border-primary/30 hover:shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge text={d.priority} tone={d.priority==="critical"||d.priority==="high"?"red":"neutral"}/><Badge text={d.status} tone="neutral"/><Badge text={`risk: ${d.computed_risk_level}`} tone={d.computed_risk_level==="critical"||d.computed_risk_level==="high"?"red":"amber"}/>{d.risk_hold&&<Badge text="PROJECT HOLD" tone="red"/>}</div><h2 className="mt-3 text-lg font-bold">{d.subject}</h2><p className="mt-1 text-sm text-muted-foreground">{d.project_title}</p></div><AlertTriangle className="h-5 w-5 text-amber-600"/></div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><Stat label="Открытых споров" value={String(d.open_disputes)}/><Stat label="Всего споров" value={String(d.total_disputes)}/><Stat label="Рост бюджета" value={`${changeRatio}%`}/><Stat label="Просрочено этапов" value={String(d.overdue_stages)}/></div>
      </Link>})}</div>
  </div>
}
function Badge({text,tone}:{text:string;tone:"red"|"amber"|"neutral"}){const c=tone==="red"?"bg-red-50 text-red-700":tone==="amber"?"bg-amber-50 text-amber-700":"bg-secondary text-muted-foreground";return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c}`}>{text}</span>}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-secondary/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>}
