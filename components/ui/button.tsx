import Link from "next/link"
import type { ComponentProps } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] outline-none select-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--shadow-subtle)] hover:bg-[var(--primary-hover)] hover:shadow-none",
        outline:
          "border-border bg-card text-foreground hover:border-primary/25 hover:bg-secondary aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-10 gap-1.5 px-3 text-[0.8125rem] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-11",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = Omit<ButtonPrimitive.Props, "className" | "nativeButton" | "render"> &
  VariantProps<typeof buttonVariants> & {
    className?: string
    loading?: boolean
    loadingText?: string
  }

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }

/**
 * Canonical action control. It intentionally cannot replace its native button
 * root: Base UI therefore always receives native button semantics.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  loadingText,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {loading && loadingText ? loadingText : children}
    </ButtonPrimitive>
  )
}

/**
 * Canonical navigation control. It styles Next Link directly, so it renders an
 * anchor and never asks Base UI's button primitive to emulate link semantics.
 */
function ButtonLink({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      data-slot="button-link"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </Link>
  )
}

export { Button, ButtonLink, buttonVariants }
