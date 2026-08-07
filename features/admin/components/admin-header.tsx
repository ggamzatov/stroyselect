import Link from "next/link";

import {
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { LogoutButton } from
  "@/features/auth/components/logout-button";

import { NotificationPopover } from
  "@/features/notifications/components/notification-popover";

import type { NotificationItem } from
  "@/features/notifications/types";

type Props = {
  userId: string;

  firstName:
    | string
    | null;

  lastName:
    | string
    | null;

  notifications:
    NotificationItem[];

  unreadCount: number;
};

export function AdminHeader({
  userId,
  firstName,
  lastName,
  notifications,
  unreadCount,
}: Props) {
  const name =
    [firstName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Администратор";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="app-container">
        <div className="flex min-h-18 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="shrink-0 text-xl font-black tracking-[-0.045em] text-foreground"
            >
              СтройВыбор
            </Link>

            <div className="hidden h-7 w-px bg-border sm:block" />

            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-primary">
                <ShieldCheck className="h-4 w-4" />
              </span>

              <div>
                <p className="text-xs font-semibold text-foreground">
                  Администрирование
                </p>

                <p className="text-[10px] text-muted-foreground">
                  Панель управления
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationPopover
              userId={userId}
              notifications={
                notifications
              }
              unreadCount={
                unreadCount
              }
            />

            <div className="hidden items-center gap-3 rounded-xl px-3 py-2 md:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary">
                <UserRound className="h-4 w-4" />
              </span>

              <div className="max-w-44">
                <p className="truncate text-sm font-semibold text-foreground">
                  {name}
                </p>

                <p className="text-xs text-muted-foreground">
                  Администратор
                </p>
              </div>
            </div>

            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}