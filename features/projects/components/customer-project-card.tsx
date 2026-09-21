import Link from "next/link"
import { ArrowRight, CalendarDays, MapPin, Wallet } from "lucide-react"

import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

export type CustomerProjectCardProject = {
  id: string
  title: string
  description: string | null
  city: string | null
  status: string
  budget_min: number | null
  budget_max: number | null
  created_at: string
  published_at: string | null
  service_categories: { id: number; name: string } | null
}

type Props = {
  project: CustomerProjectCardProject
  className?: string
}

/** Customer-facing project summary. It only translates existing project data into UI. */
export function CustomerProjectCard({ project, className }: Props) {
  const presentation = getProjectPresentation(project.status)

  return (
    <Link
      href={`/customer/projects/${project.id}`}
      className={cn(
        "group block rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status}>{presentation.label}</StatusBadge>
            <span className="truncate text-xs font-medium text-muted-foreground">
              {project.service_categories?.name ?? "Категория не указана"}
            </span>
          </div>
          <h2 className="mt-3 line-clamp-2 text-lg font-semibold tracking-tight text-foreground">{project.title}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            {project.city || "Город не указан"}
          </p>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      </div>

      {project.description ? <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description}</p> : null}

      <div className="mt-5 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
        <ProjectFact icon={Wallet} label="Бюджет" value={formatBudget(project.budget_min, project.budget_max)} />
        <ProjectFact
          icon={CalendarDays}
          label={project.published_at ? "Опубликован" : "Создан"}
          value={formatDate(project.published_at ?? project.created_at)}
        />
      </div>
    </Link>
  )
}

function ProjectFact({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-sm)] bg-muted/55 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 text-primary" aria-hidden="true" />{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function getProjectPresentation(status: string) {
  const labels: Record<string, string> = {
    draft: "Черновик",
    published: "Ищем исполнителя",
    collecting_bids: "Получаем предложения",
    matching: "Подбираем специалистов",
    contractor_selected: "Исполнитель выбран",
    in_progress: "В работе",
    completed: "Завершён",
    disputed: "Есть спор",
  }

  return { label: labels[status] ?? status }
}

function formatBudget(min: number | null, max: number | null) {
  const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value)
  if (min !== null && max !== null) return `${money(min)} — ${money(max)}`
  if (min !== null) return `от ${money(min)}`
  if (max !== null) return `до ${money(max)}`
  return "Не указан"
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value))
}
