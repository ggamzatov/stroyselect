import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  className?: string
}

/** Small dependency-free tooltip for icon-only controls and terse labels. */
export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 w-max max-w-56 -translate-x-1/2 rounded-[var(--radius-sm)] bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-[var(--shadow-elevated)] transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          className
        )}
      >
        {content}
      </span>
    </span>
  )
}
