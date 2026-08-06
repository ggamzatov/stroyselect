"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { NotificationBell } from
  "@/features/notifications/components/notification-bell";

import { NotificationDropdown } from
  "@/features/notifications/components/notification-dropdown";

import { useNotifications } from
  "@/features/notifications/hooks/use-notifications";

import type { NotificationItem } from
  "@/features/notifications/types";

type Props = {
  userId: string;
  unreadCount: number;
  notifications: NotificationItem[];
};

export function NotificationPopover({
  userId,
  unreadCount,
  notifications,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useNotifications(userId);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(
          target
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <NotificationBell
        unreadCount={unreadCount}
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
        isOpen={open}
      />

      {open && (
        <div className="absolute right-0 top-12 z-50">
          <NotificationDropdown
            notifications={
              notifications
            }
            onClose={() =>
              setOpen(false)
            }
          />
        </div>
      )}
    </div>
  );
}