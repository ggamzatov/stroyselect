import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type MobileNavItemProps = {
  href: string
  label: string
  active: boolean
  icon: ReactNode
}

export function MobileNavItem({ href, label, active, icon }: MobileNavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] px-1 text-[0.6875rem] font-semibold",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </Link>
  )
}

export function MobileNav({ children, label }: { children: ReactNode; label: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(20,35,27,0.08)] backdrop-blur lg:hidden"
      aria-label={label}
    >
      <div className="mx-auto grid max-w-md grid-cols-4 items-end">{children}</div>
    </nav>
  )
}
