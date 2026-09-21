import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ActivityProps = {
  title: string
  meta?: string
  icon?: ReactNode
  className?: string
}

export function Activity({ title, meta, icon, className }: ActivityProps) {
  return (
    <div className={cn("flex gap-3 py-3", className)}>
      {icon ? <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">{icon}</span> : null}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {meta ? <p className="mt-1 text-xs text-muted-foreground">{meta}</p> : null}
      </div>
    </div>
  )
}
