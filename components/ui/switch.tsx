import * as React from "react"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <span className="relative inline-flex h-6 w-11 shrink-0">
      <input
        type="checkbox"
        role="switch"
        data-slot="switch"
        className={cn(
          "peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-muted transition-colors focus-visible:ring-4 focus-visible:ring-ring/15 checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      <span className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-card shadow-[var(--shadow-subtle)] transition-transform peer-checked:translate-x-5" aria-hidden="true" />
    </span>
  )
}

export { Switch }
