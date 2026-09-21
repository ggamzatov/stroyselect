import Link from "next/link"
import { ArrowRight, Banknote, Building2, CalendarDays, CheckCircle2, MapPin, Send } from "lucide-react"

import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

export type ContractorOpportunity = {
  id: string
  title: string
  description: string | null
  property_type: string | null
  city: string | null
  budget_min: number | null
  budget_max: number | null
  desired_start_date: string | null
  published_at: string | null
  created_at: string
  is_invited: boolean
  service_categories: { id: number; name: string } | null
  project_bids: Array<{ id: string; contractor_id: string; status: string }>
}

type Props = { project: ContractorOpportunity; contractorId: string; className?: string }

/** A factual, contractor-facing opportunity preview. Matching/ranking data is deliberately not rendered. */
export function ContractorProjectCard({ project, contractorId, className }: Props) {
  const bid = project.project_bids.find((item) => item.contractor_id === contractorId)
  const action = bid ? getBidState(bid.status) : project.is_invited ? "Ответить на приглашение" : "Посмотреть заказ"

  return (
    <article className={cn("flex min-w-0 flex-col rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={bid?.status} tone={bid ? undefined : "info"}>{bid ? getBidState(bid.status) : project.is_invited ? "Есть приглашение" : "Открыт для предложений"}</StatusBadge>
            <span className="truncate text-xs font-medium text-muted-foreground">{project.service_categories?.name ?? "Строительные работы"}</span>
          </div>
          <h2 className="mt-3 line-clamp-2 text-lg font-semibold tracking-tight text-foreground">{project.title}</h2>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      {project.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description}</p> : null}

      <div className="mt-4 grid gap-2 border-y border-border py-4 sm:grid-cols-2">
        <Fact icon={MapPin} label="Город" value={project.city || "Не указан"} />
        <Fact icon={Banknote} label="Бюджет" value={formatBudget(project.budget_min, project.budget_max)} emphasized />
        <Fact icon={Building2} label="Объект" value={formatPropertyType(project.property_type)} />
        <Fact icon={CalendarDays} label="Начало" value={project.desired_start_date ? formatDate(project.desired_start_date) : "Не указано"} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Опубликован {formatDate(project.published_at ?? project.created_at)}</span>
        {bid ? <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="size-3.5" aria-hidden="true" />Предложение есть</span> : null}
      </div>
      <Link href={`/contractor/projects/${project.id}`} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--primary-hover)]">
        {bid ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {action}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  )
}

function Fact({ icon: Icon, label, value, emphasized }: { icon: typeof MapPin; label: string; value: string; emphasized?: boolean }) {
  return <div className="min-w-0"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 text-primary" aria-hidden="true" />{label}</p><p className={cn("mt-1 truncate text-sm font-medium text-foreground", emphasized && "font-semibold")}>{value}</p></div>
}

export function getBidState(status: string) {
  return ({ submitted: "Предложение отправлено", viewed: "Заказчик посмотрел", shortlisted: "В коротком списке", accepted: "Заказчик выбрал вас", rejected: "Не выбрано", withdrawn: "Предложение отозвано" } as Record<string, string>)[status] ?? status
}

function formatBudget(min: number | null, max: number | null) {
  const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value)
  if (min !== null && max !== null) return `${money(min)} — ${money(max)}`
  if (min !== null) return `от ${money(min)}`
  if (max !== null) return `до ${money(max)}`
  return "Не указан"
}

function formatPropertyType(value: string | null) {
  return ({ apartment: "Квартира", private_house: "Частный дом", commercial: "Коммерческий объект", land: "Участок", industrial: "Производственный объект", other: "Другое" } as Record<string, string>)[value ?? ""] ?? "Не указан"
}

function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) }
