"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderKanban,
  HardHat,
  Home,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

import { StroyVyborLogo } from "@/components/brand/stroyvybor-logo";

type CustomerShellProps = {
  children: React.ReactNode;
  profileName: string;
  notificationControl: React.ReactNode;
  signOutControl: React.ReactNode;
};

const navigation = [
  { label: "Главная", href: "/customer/dashboard", icon: Home },
  { label: "Проекты", href: "/customer/projects", icon: FolderKanban },
  { label: "Предложения", href: "/customer/bids", icon: FileText },
  { label: "Специалисты", href: "/customer/contractors", icon: HardHat },
];

export function CustomerShell({ children, profileName, notificationControl, signOutControl }: CustomerShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1720px]">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-card px-4 py-6 xl:flex">
          <Link href="/customer/dashboard" className="flex min-h-12 items-center rounded-2xl px-2" aria-label="СтройВыбор — главная">
            <StroyVyborLogo className="w-[174px]" />
          </Link>

          <nav className="mt-8 space-y-1" aria-label="Основная навигация заказчика">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={["group relative flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition", active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"].join(" ")}>
                  {active ? <span className="absolute inset-y-2 -left-4 w-[3px] rounded-r-full bg-primary" /> : null}
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 border-t border-border pt-5">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><UserRound className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{profileName}</p><p className="text-xs text-muted-foreground">Заказчик</p></div>
            </div>
            <div>{signOutControl}</div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-border/80 bg-background/92 backdrop-blur-xl">
            <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-10">
              <Link href="/customer/dashboard" className="flex min-h-10 items-center xl:hidden" aria-label="СтройВыбор — главная">
                <StroyVyborLogo className="w-[150px] sm:w-[166px]" />
              </Link>

              <Link href="/customer/contractors" className="mx-auto hidden min-h-11 w-full max-w-[520px] items-center gap-3 rounded-xl border border-border bg-card px-4 text-sm text-muted-foreground shadow-sm transition hover:border-primary/25 hover:text-foreground md:flex" aria-label="Перейти к поиску специалистов">
                <Search className="h-4 w-4" aria-hidden="true" /><span className="truncate">Поиск услуг, специалистов, подрядчиков…</span>
              </Link>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {notificationControl}
                <Link href="/customer/dashboard" className="hidden min-h-11 items-center gap-3 rounded-xl px-2 transition hover:bg-secondary sm:flex" aria-label={`Профиль: ${profileName}`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="hidden max-w-40 truncate text-sm font-semibold text-foreground lg:block">{profileName}</span>
                </Link>
              </div>
            </div>
          </header>
          <div className="pb-24 xl:pb-0">{children}</div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/96 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(20,35,27,0.08)] backdrop-blur-xl xl:hidden" aria-label="Мобильная навигация">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
          <MobileItem href="/customer/dashboard" label="Главная" active={isActivePath(pathname, "/customer/dashboard")} icon={<Home className="h-5 w-5" aria-hidden="true" />} />
          <MobileItem href="/customer/projects" label="Проекты" active={isActivePath(pathname, "/customer/projects")} icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />} />
          <Link href="/customer/projects/new" className="mx-auto -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(8,122,80,0.28)] transition hover:-translate-y-0.5 hover:bg-[#076c47]" aria-label="Создать проект"><Plus className="h-7 w-7" aria-hidden="true" /></Link>
          <MobileItem href="/customer/bids" label="Предложения" active={isActivePath(pathname, "/customer/bids")} icon={<FileText className="h-5 w-5" aria-hidden="true" />} />
          <MobileItem href="/customer/contractors" label="Специалисты" active={isActivePath(pathname, "/customer/contractors")} icon={<HardHat className="h-5 w-5" aria-hidden="true" />} />
        </div>
      </nav>
    </div>
  );
}

function MobileItem({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: React.ReactNode }) {
  return <Link href={href} className={["flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition", active ? "text-primary" : "text-muted-foreground"].join(" ")}>{icon}<span className="max-w-full truncate">{label}</span></Link>;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
