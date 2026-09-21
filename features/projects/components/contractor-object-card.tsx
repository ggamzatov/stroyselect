import Link from "next/link"
import { ArrowRight, Banknote, CalendarDays, MapPin } from "lucide-react"

import { StatusBadge } from "@/components/ui/status-badge"

export type ContractorObject = {
  id: string
  title: string
  city: string | null
  address: string | null
  status: string
  desired_end_date: string | null
  project_bids: { price: number | null } | null
  service_categories: { id: number; name: string } | null
}

/** Entry point to the existing workspace; no stage or customer data is invented here. */
export function ContractorObjectCard({ project }: { project: ContractorObject }) {
  const state = getObjectState(project.status)
  return <article className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={project.status}>{state.label}</StatusBadge><span className="text-xs text-muted-foreground">{project.service_categories?.name ?? "Объект"}</span></div><h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{project.title}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" aria-hidden="true" />{[project.city, project.address].filter(Boolean).join(", ") || "Адрес не указан"}</p></div><ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /></div><div className="mt-4 grid gap-2 border-y border-border py-4 sm:grid-cols-2"><Fact icon={Banknote} label="Принятое предложение" value={project.project_bids?.price !== null && project.project_bids?.price !== undefined ? formatMoney(project.project_bids.price) : "Не указано"} /><Fact icon={CalendarDays} label="План завершения" value={formatDate(project.desired_end_date)} /></div><Link href={`/contractor/work/${project.id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--primary-hover)]">{state.action}<ArrowRight className="size-4" aria-hidden="true" /></Link><p className="mt-3 text-sm leading-6 text-muted-foreground">{state.description}</p></article>
}

function Fact({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) { return <div><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 text-primary" aria-hidden="true" />{label}</p><p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p></div> }
function getObjectState(status: string) { if (status === "contractor_selected") return { label: "Подготовка к работе", action: "Открыть объект", description: "Заказчик выбрал ваше предложение. Продолжите подготовку к работе." }; if (status === "disputed") return { label: "Нужна реакция", action: "Открыть объект", description: "В рабочем пространстве отображаются действия по текущей ситуации." }; if (status === "completed") return { label: "Завершён", action: "Открыть итог", description: "Работа по объекту завершена." }; return { label: "В работе", action: "Открыть объект", description: "В рабочем пространстве доступны этапы, материалы и диалог с заказчиком." } }
function formatMoney(value: number) { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value) }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : "Не указан" }
