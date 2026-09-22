"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import type { NotificationItem } from "@/features/notifications/types";

type Props = {
  userId: string;
  notifications: NotificationItem[];
  unreadCount: number;
};

export function NotificationCenter({ userId, notifications, unreadCount }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useNotifications(userId);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <NotificationBell
        unreadCount={unreadCount}
        isOpen={isOpen}
        controlsId={panelId}
        onClick={() => setIsOpen((current) => !current)}
      />

      {isOpen && (
        <div className="fixed inset-x-3 top-[4.75rem] z-[100] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)]">
          <NotificationDropdown
            panelId={panelId}
            notifications={notifications}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
