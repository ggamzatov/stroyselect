import type { ComponentProps, ReactNode } from "react"
import { CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

export function FormField({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="form-field" className={cn("grid gap-2", className)} {...props} />
}

export function FormHelperText({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="form-helper-text"
      className={cn("text-xs leading-5 text-muted-foreground", className)}
      {...props}
    />
  )
}

export function FormError({ children, className, ...props }: ComponentProps<"p"> & { children: ReactNode }) {
  return (
    <p
      data-slot="form-error"
      role="alert"
      className={cn("flex items-start gap-1.5 text-xs leading-5 text-destructive", className)}
      {...props}
    >
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-5 border-t border-border pt-6 first:border-t-0 first:pt-0", className)}>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}
