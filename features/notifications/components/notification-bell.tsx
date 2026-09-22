"use client";

import { Bell } from "lucide-react";

type Props = {
  unreadCount: number;
  isOpen: boolean;
  onClick: () => void;
  controlsId?: string;
};

export function NotificationBell({
  unreadCount,
  isOpen,
  onClick,
  controlsId,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        unreadCount > 0
          ? `Уведомления, непрочитанных: ${unreadCount}`
          : "Уведомления"
      }
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-controls={controlsId}
      className={[
        "relative flex h-11 w-11 items-center justify-center rounded-xl border transition",
        isOpen
          ? "border-primary/30 bg-secondary text-primary"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground",
      ].join(" ")}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />

      {unreadCount > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
          aria-hidden="true"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
