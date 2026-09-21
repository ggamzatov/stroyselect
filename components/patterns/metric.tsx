import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type MetricProps = {
  label: string
  value: ReactNode
  note?: string
  className?: string
}

export function Metric({ label, value, note, className }: MetricProps) {
  return (
    <div className={cn("rounded-[var(--radius-md)] border border-border bg-card p-4 shadow-[var(--shadow-subtle)]", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="numeric mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  )
}
