import * as React from "react"

import { cn } from "@/lib/utils"

function Radio({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <span className="relative inline-flex size-5 shrink-0">
      <input
        type="radio"
        data-slot="radio"
        className={cn(
          "peer size-5 appearance-none rounded-full border border-input bg-card transition-[background-color,border-color,box-shadow] checked:border-primary focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      <span className="pointer-events-none absolute inset-[5px] rounded-full bg-primary opacity-0 peer-checked:opacity-100" aria-hidden="true" />
    </span>
  )
}

export { Radio }
