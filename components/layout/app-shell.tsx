"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MoreHorizontal, Plus, Search, UserRound } from "lucide-react"
import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { DesktopNav, pathIsActive, type NavigationItem } from "@/components/navigation/desktop-nav"
import { MobileNav, MobileNavItem } from "@/components/navigation/mobile-nav"
import { cn } from "@/lib/utils"

export type AppShellAction = {
  href: string
  label: string
  ariaLabel?: string
}

type AppShellProps = {
  children: ReactNode
  profileName: string
  profileLabel: string
  profileHref: string
  homeHref: string
  navigation: NavigationItem[]
  secondaryNavigation?: NavigationItem[]
  primaryAction: AppShellAction
  searchAction?: AppShellAction
  notificationControl: ReactNode
  signOutControl: ReactNode
  mobileNavigation?: NavigationItem[]
}

/** Shared authenticated shell. Route and data ownership remain with layouts/pages. */
export function AppShell({
  children,
  profileName,
  profileLabel,
  profileHref,
  homeHref,
  navigation,
  secondaryNavigation = [],
  primaryAction,
  searchAction,
  notificationControl,
  signOutControl,
  mobileNavigation = navigation.slice(0, 2),
}: AppShellProps) {
  const pathname = usePathname()
  const activeItem = [...navigation, ...secondaryNavigation].find((item) =>
    pathIsActive(pathname, item.href, item.exact)
  )
  const overflowItems = [...navigation.slice(2), ...secondaryNavigation]

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#app-content"
        className="sr-only z-[60] rounded-[var(--radius-sm)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Перейти к содержимому
      </a>

      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card px-3 py-5 lg:flex">
          <Link
            href={homeHref}
            className="flex min-h-12 items-center rounded-[var(--radius-sm)] px-3 focus-visible:outline-none"
            aria-label="СтройВыбор — главная"
          >
            <Logo className="w-40" />
          </Link>

          <div className="mt-7">
            <DesktopNav items={navigation} pathname={pathname} label="Основная навигация" />
          </div>

          {secondaryNavigation.length ? (
            <div className="mt-6 border-t border-border pt-4">
              <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Ещё
              </p>
              <DesktopNav
                items={secondaryNavigation}
                pathname={pathname}
                label="Дополнительная навигация"
                secondary
              />
            </div>
          ) : null}

          <div className="mt-auto border-t border-border pt-4">
            <Link
              href={profileHref}
              className="flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] px-3 transition-colors hover:bg-muted"
              aria-label={`Профиль: ${profileName}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <UserRound className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{profileName}</span>
                <span className="block text-xs text-muted-foreground">{profileLabel}</span>
              </span>
            </Link>
            <div className="mt-2 px-1">{signOutControl}</div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur">
            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <Link
                href={homeHref}
                className="flex min-h-11 items-center lg:hidden"
                aria-label="СтройВыбор — главная"
              >
                <Logo className="w-32 sm:w-36" />
              </Link>

              <p className="hidden min-w-0 truncate text-sm font-semibold text-foreground lg:block">
                {activeItem?.label ?? profileLabel}
              </p>

              {searchAction ? (
                <Link
                  href={searchAction.href}
                  className="mx-auto hidden min-h-11 w-full max-w-xl items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-card px-3 text-sm text-muted-foreground shadow-[var(--shadow-subtle)] hover:border-primary/25 hover:text-foreground md:flex"
                  aria-label={searchAction.ariaLabel ?? searchAction.label}
                >
                  <Search className="size-4" aria-hidden="true" />
                  <span className="truncate">{searchAction.label}</span>
                </Link>
              ) : <span className="flex-1" />}

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {notificationControl}
                <Link
                  href={profileHref}
                  className="hidden min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-2 hover:bg-muted sm:flex"
                  aria-label={`Профиль: ${profileName}`}
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
                    <UserRound className="size-4" aria-hidden="true" />
                  </span>
                  <span className="hidden max-w-36 truncate text-sm font-semibold lg:block">{profileName}</span>
                </Link>
              </div>
            </div>
          </header>

          <div id="app-content" className="min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
          </div>
        </div>
      </div>

      <MobileNav label="Мобильная навигация">
        {mobileNavigation.slice(0, 2).map((item) => {
          const Icon = item.icon
          return (
            <MobileNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              active={pathIsActive(pathname, item.href)}
              icon={<Icon className="size-5" aria-hidden="true" />}
            />
          )
        })}
        <Link
          href={primaryAction.href}
          className="mx-auto -mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elevated)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
          aria-label={primaryAction.ariaLabel ?? primaryAction.label}
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
        <details className="group relative">
          <summary
            className={cn(
              "flex min-h-11 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] px-1 text-[0.6875rem] font-semibold text-muted-foreground marker:hidden",
              overflowItems.some((item) => pathIsActive(pathname, item.href, item.exact)) && "text-primary"
            )}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
            <span>Ещё</span>
          </summary>
          <div className="absolute right-0 bottom-14 z-10 w-64 rounded-[var(--radius-md)] border border-border bg-card p-2 shadow-[var(--shadow-elevated)]">
            <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">Разделы приложения</p>
            {overflowItems.map((item) => {
              const Icon = item.icon
              const active = pathIsActive(pathname, item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-semibold",
                    active ? "bg-secondary text-primary" : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </details>
      </MobileNav>
    </div>
  )
}
