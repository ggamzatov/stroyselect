"use client";

import { Bell, Sparkles } from "lucide-react";

type Props = {
  unreadCount: number;
  isOpen: boolean;
  onClick: () => void;
};

export function NotificationBell({ unreadCount, isOpen, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unreadCount > 0 ? `Уведомления, непрочитанных: ${unreadCount}` : "Уведомления"}
      aria-expanded={isOpen}
      className={[
        "relative flex h-10 w-10 items-center justify-center rounded-2xl border transition duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        isOpen
          ? "border-primary/25 bg-primary/10 text-primary shadow-[0_8px_20px_rgba(0,122,78,0.08)]"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground",
      ].join(" ")}
    >
      <Bell className="h-[19px] w-[19px]" />

      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-sm">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {isOpen && unreadCount === 0 && (
        <Sparkles aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-primary" />
      )}
    </button>
  );
}
