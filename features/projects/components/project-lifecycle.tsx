import { Check, CircleDot } from "lucide-react"

import { cn } from "@/lib/utils"

const stages = ["Заявка", "Предложения", "Исполнитель", "Договор", "Работа", "Завершение"]

type Props = { status: string; className?: string }

/** A visual orientation aid; project statuses and transitions remain unchanged. */
export function ProjectLifecycle({ status, className }: Props) {
  const activeIndex = getActiveIndex(status)

  return (
    <section className={cn("rounded-[var(--radius-md)] border border-border bg-card p-4 shadow-[var(--shadow-subtle)] sm:p-5", className)} aria-labelledby="project-lifecycle-title">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-primary">Путь проекта</p>
          <h2 id="project-lifecycle-title" className="mt-1 text-base font-semibold text-foreground">Где вы сейчас</h2>
        </div>
        <span className="text-xs text-muted-foreground">{activeIndex + 1} из {stages.length}</span>
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-6" aria-label="Этапы проекта">
        {stages.map((stage, index) => {
          const complete = index < activeIndex
          const current = index === activeIndex
          return (
            <li key={stage} className="relative min-w-0 sm:pt-0">
              <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                <span className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  complete && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary bg-primary/10 text-primary",
                  !complete && !current && "border-border bg-card text-muted-foreground",
                )}>
                  {complete ? <Check className="size-3.5" aria-hidden="true" /> : current ? <CircleDot className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn("text-xs font-medium sm:mt-2", current ? "text-foreground" : "text-muted-foreground")}>{stage}</span>
              </div>
              {index < stages.length - 1 ? <span className={cn("absolute left-3 top-7 hidden h-px w-[calc(100%-1.1rem)] sm:block", index < activeIndex ? "bg-primary" : "bg-border")} aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function getActiveIndex(status: string) {
  switch (status) {
    case "draft": return 0
    case "published":
    case "collecting_bids":
    case "matching": return 1
    case "contractor_selected": return 3
    case "in_progress":
    case "disputed": return 4
    case "completed": return 5
    default: return 0
  }
}
