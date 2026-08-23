"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpenText,
  Building2,
  FolderKanban,
  History,
  LayoutDashboard,
  MessageSquareText,
  MousePointerClick,
  Rocket,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

const navigation = [
  { href: "/admin/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/admin/analytics/discovery", label: "Публичный спрос", icon: MousePointerClick },
  { href: "/admin/operations", label: "Операции", icon: Activity },
  { href: "/admin/release", label: "Готовность к запуску", icon: Rocket },
  { href: "/admin/contractors", label: "Подрядчики", icon: Building2 },
  { href: "/admin/projects", label: "Проекты", icon: FolderKanban },
  { href: "/admin/disputes", label: "Споры и риски", icon: ShieldAlert },
  { href: "/admin/reviews", label: "Отзывы", icon: MessageSquareText },
  { href: "/admin/users", label: "Пользователи", icon: UsersRound },
  { href: "/admin/catalog", label: "Справочники", icon: BookOpenText },
  { href: "/admin/errors", label: "Ошибки", icon: AlertTriangle },
  { href: "/admin/audit", label: "Журнал действий", icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-24 overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="border-b border-border p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Управление</p>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground">Админ-панель</h2>
          </div>
          <nav className="space-y-1 p-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/admin/analytics" && pathname.startsWith(`${item.href}/`));
              return (
                <Link key={item.href} href={item.href} className={["group flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition", active ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(107,70,50,0.16)]" : "text-muted-foreground hover:bg-secondary hover:text-foreground"].join(" ")}>
                  <Icon className={["h-4.5 w-4.5 shrink-0", active ? "text-primary-foreground" : "text-primary"].join(" ")} />
                  <span className="min-w-0 break-words">{item.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary-foreground/80" />}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-4"><div className="rounded-2xl bg-secondary/60 p-4"><p className="text-xs font-semibold text-primary">СтройВыбор</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Центр управления платформой</p></div></div>
        </div>
      </aside>

      <nav className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin/analytics" && pathname.startsWith(`${item.href}/`));
          return <Link key={item.href} href={item.href} className={["inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition", active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"].join(" ")}><Icon className="h-4 w-4" />{item.label}</Link>;
        })}
      </nav>
    </>
  );
}
