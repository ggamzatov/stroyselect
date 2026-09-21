"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Banknote,
  CalendarClock,
  ChevronDown,
  FileSignature,
  FileText,
  FolderOpen,
  ListChecks,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  ShieldAlert,
  ShoppingCart,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type ProjectNavProps = {
  projectId: string
  role: "customer" | "contractor"
  executionUnlocked?: boolean
}

type ProjectRoute = {
  suffix: string
  label: string
  icon: LucideIcon
  requiresContract: boolean
}

const routes: Record<"overview" | "chat" | "budget" | "materials" | "documents" | "appointments" | "contract" | "issues" | "disputes", ProjectRoute> = {
  overview: { suffix: "", label: "Обзор", icon: FolderOpen, requiresContract: false },
  chat: { suffix: "/chat", label: "Общение", icon: MessageCircle, requiresContract: false },
  budget: { suffix: "/changes", label: "Бюджет и платежи", icon: Banknote, requiresContract: true },
  materials: { suffix: "/materials", label: "Материалы", icon: ShoppingCart, requiresContract: true },
  documents: { suffix: "/documents", label: "Документы", icon: FileText, requiresContract: true },
  appointments: { suffix: "/appointments", label: "Встречи", icon: CalendarClock, requiresContract: false },
  contract: { suffix: "/contract", label: "Договор", icon: FileSignature, requiresContract: false },
  issues: { suffix: "/issues", label: "Замечания", icon: ListChecks, requiresContract: true },
  disputes: { suffix: "/disputes", label: "Споры", icon: ShieldAlert, requiresContract: true },
}

function routeIsActive(pathname: string, href: string, suffix: string) {
  return suffix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href
}

function RouteLink({
  route,
  base,
  pathname,
  executionUnlocked,
  compact = false,
}: {
  route: ProjectRoute
  base: string
  pathname: string
  executionUnlocked: boolean
  compact?: boolean
}) {
  const href = `${base}${route.suffix}`
  const active = routeIsActive(pathname, href, route.suffix)
  const locked = route.requiresContract && !executionUnlocked
  const Icon = route.icon

  if (locked) {
    return (
      <span
        title="Раздел откроется после подписания договора обеими сторонами"
        aria-disabled="true"
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-semibold text-muted-foreground opacity-55",
          compact && "px-2 text-xs"
        )}
      >
        <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{route.label}</span>
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-semibold transition-colors",
        active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        compact && "px-2 text-xs"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{route.label}</span>
    </Link>
  )
}

function NavGroup({
  label,
  icon: Icon,
  active,
  children,
}: {
  label: string
  icon: LucideIcon
  active: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(active)

  return (
    <details className="group relative" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-semibold marker:hidden",
          active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown className="ml-1 size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute top-[calc(100%+0.5rem)] left-0 z-30 min-w-56 rounded-[var(--radius-md)] border border-border bg-card p-2 shadow-[var(--shadow-elevated)]">
        {children}
      </div>
    </details>
  )
}

/** Groups existing workspace routes; it does not create or rename routes. */
export function ProjectNav({ projectId, role, executionUnlocked = false }: ProjectNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/${role}/work/${projectId}`
  const workRoutes = [routes.budget, routes.materials, routes.appointments, routes.issues]
  const moreRoutes = [routes.contract, routes.disputes]
  const workActive = workRoutes.some((route) => routeIsActive(pathname, `${base}${route.suffix}`, route.suffix))
  const moreActive = moreRoutes.some((route) => routeIsActive(pathname, `${base}${route.suffix}`, route.suffix))
  const mobileRoutes = [
    routes.overview,
    ...workRoutes,
    routes.chat,
    routes.documents,
    ...moreRoutes,
  ]
  const currentRoute = mobileRoutes.find((route) =>
    routeIsActive(pathname, `${base}${route.suffix}`, route.suffix)
  )

  return (
    <div className="border-b border-border bg-background px-4 py-3 sm:px-6 lg:px-8">
      <nav aria-label="Разделы рабочего пространства" className="mx-auto max-w-7xl">
        <div className="hidden items-center gap-1 lg:flex">
          <RouteLink route={routes.overview} base={base} pathname={pathname} executionUnlocked={executionUnlocked} />
          <NavGroup key={workActive ? "work-active" : "work-inactive"} label="Работа" icon={ListChecks} active={workActive}>
            {workRoutes.map((route) => (
              <RouteLink key={route.suffix} route={route} base={base} pathname={pathname} executionUnlocked={executionUnlocked} />
            ))}
          </NavGroup>
          <RouteLink route={routes.chat} base={base} pathname={pathname} executionUnlocked={executionUnlocked} />
          <RouteLink route={routes.documents} base={base} pathname={pathname} executionUnlocked={executionUnlocked} />
          <NavGroup key={moreActive ? "more-active" : "more-inactive"} label="Ещё" icon={MoreHorizontal} active={moreActive}>
            {moreRoutes.map((route) => (
              <RouteLink key={route.suffix} route={route} base={base} pathname={pathname} executionUnlocked={executionUnlocked} />
            ))}
          </NavGroup>
        </div>

        <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-card px-3 lg:hidden">
          <ListChecks className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="sr-only">Раздел рабочего пространства</span>
          <select
            aria-label="Раздел рабочего пространства"
            value={currentRoute?.suffix ?? ""}
            onChange={(event) => router.push(`${base}${event.target.value}`)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none"
          >
            <option value="">Обзор</option>
            <optgroup label="Работа">
              {workRoutes.map((route) => (
                <option key={route.suffix} value={route.suffix} disabled={route.requiresContract && !executionUnlocked}>
                  {route.label}{route.requiresContract && !executionUnlocked ? " — после договора" : ""}
                </option>
              ))}
            </optgroup>
            <option value={routes.chat.suffix}>Общение</option>
            <option value={routes.documents.suffix} disabled={!executionUnlocked}>Документы{!executionUnlocked ? " — после договора" : ""}</option>
            <optgroup label="Ещё">
              {moreRoutes.map((route) => (
                <option key={route.suffix} value={route.suffix} disabled={route.requiresContract && !executionUnlocked}>
                  {route.label}{route.requiresContract && !executionUnlocked ? " — после договора" : ""}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <Link href={`${base}/chat`} className="mt-2 inline-flex min-h-10 items-center gap-2 px-2 text-sm font-semibold text-primary lg:hidden">
          <MessageCircle className="size-4" aria-hidden="true" />
          Открыть общение
        </Link>
      </nav>
    </div>
  )
}
