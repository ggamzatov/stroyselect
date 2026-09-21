import type { ReactNode } from "react"

import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

type EntityHeaderProps = {
  title: string
  meta?: string
  status?: { label: string; value?: string; tone?: StatusTone }
  detail?: ReactNode
  action?: ReactNode
  className?: string
}

/** Foundation for project/workspace headers; data remains feature-owned. */
export function EntityHeader({ title, meta, status, detail, action, className }: EntityHeaderProps) {
  return (
    <header className={cn("rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] sm:p-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
            {status ? <StatusBadge status={status.value} tone={status.tone}>{status.label}</StatusBadge> : null}
          </div>
          {meta ? <p className="mt-2 text-sm text-muted-foreground">{meta}</p> : null}
          {detail ? <div className="mt-4 text-sm text-muted-foreground">{detail}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}
