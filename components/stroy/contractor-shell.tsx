"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BriefcaseBusiness,
  Building2,
  FolderKanban,
  Home,
  Settings,
  UserRound,
} from "lucide-react";

type ContractorShellProps = {
  children: React.ReactNode;
};

const navigation = [
  {
    label: "Главная",
    href: "/contractor/dashboard",
    icon: Home,
  },
  {
    label: "Проекты",
    href: "/contractor/projects",
    icon: FolderKanban,
  },
  {
    label: "Предложения",
    href: "/contractor/bids",
    icon: BriefcaseBusiness,
  },
  {
    label: "Мои объекты",
    href: "/contractor/work",
    icon: Building2,
  },
];

export function ContractorShell({
  children,
}: ContractorShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {/* Desktop sidebar */}

        <aside className="hidden w-[260px] shrink-0 border-r border-border bg-card/80 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
          <Link
            href="/contractor/dashboard"
            className="flex items-center gap-3 px-2"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-[0_12px_30px_rgba(107,70,50,0.22)]">
              S
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight text-foreground">
                StroySelect
              </p>

              <p className="text-xs text-muted-foreground">
                Кабинет подрядчика
              </p>
            </div>
          </Link>

          <nav className="mt-10 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_10px_25px_rgba(107,70,50,0.18)]"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />

                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-border pt-5">
            <Link
              href="/contractor/company"
              className={[
                "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition",
                pathname.startsWith("/contractor/company")
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              ].join(" ")}
            >
              <UserRound className="h-5 w-5" />
              Профиль компании
            </Link>

            <Link
              href="/contractor/settings"
              className="mt-1 flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
              Настройки
            </Link>
          </div>
        </aside>

        {/* Main content */}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 hidden h-20 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-xl lg:flex">
            <div>
              <p className="text-sm font-semibold text-primary">
                StroySelect
              </p>

              <p className="text-xs text-muted-foreground">
                Кабинет подрядчика
              </p>
            </div>

            <Link
              href="/contractor/company"
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 transition hover:border-primary/25 hover:shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                <UserRound className="h-4 w-4" />
              </div>

              <span className="text-sm font-semibold text-foreground">
                Профиль
              </span>
            </Link>
          </header>

          <div className="pb-24 lg:pb-0">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_35px_rgba(66,43,30,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition",
                  active
                    ? "text-primary"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-8 w-12 items-center justify-center rounded-full transition",
                    active
                      ? "bg-secondary"
                      : "",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}