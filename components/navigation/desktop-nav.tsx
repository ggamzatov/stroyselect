import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type NavigationItem = {
  label: string
  href: string
  icon: LucideIcon
  description?: string
  exact?: boolean
}

type DesktopNavProps = {
  items: NavigationItem[]
  pathname: string
  label: string
  secondary?: boolean
}

export function pathIsActive(pathname: string, href: string, exact = false) {
  return pathname === href || (!exact && pathname.startsWith(`${href}/`))
}

export function DesktopNav({ items, pathname, label, secondary = false }: DesktopNavProps) {
  return (
    <nav aria-label={label} className={cn("space-y-1", secondary && "pt-2")}>
      {items.map((item) => {
        const Icon = item.icon
        const active = pathIsActive(pathname, item.href, item.exact)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-semibold transition-colors",
              active
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary" /> : null}
            <Icon className="size-4" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
