"use client";

import { Bell } from
  "lucide-react";

type Props = {
  unreadCount: number;
  isOpen: boolean;
  onClick: () => void;
};

export function NotificationBell({
  unreadCount,
  isOpen,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Уведомления"
      aria-expanded={isOpen}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
    >
      <Bell className="h-5 w-5" />

      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99
            ? "99+"
            : unreadCount}
        </span>
      )}
    </button>
  );
}