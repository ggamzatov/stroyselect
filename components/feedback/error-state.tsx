import type { ReactNode } from "react"
import { CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

type ErrorStateProps = {
  title?: string
  description: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = "Не удалось загрузить данные",
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <section role="alert" className={cn("rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/5 p-5", className)}>
      <div className="flex gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </section>
  )
}
