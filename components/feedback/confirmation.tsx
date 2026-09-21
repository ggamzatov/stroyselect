import { CheckCircle2 } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ConfirmationProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function Confirmation({ title, description, action, className }: ConfirmationProps) {
  return (
    <section role="status" aria-live="polite" className={cn("rounded-[var(--radius-md)] border border-success/20 bg-success/5 p-5", className)}>
      <div className="flex gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </section>
  )
}
