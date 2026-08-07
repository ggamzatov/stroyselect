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

import type { NotificationItem } from
  "@/features/notifications/types";

type Props = {
  notifications: NotificationItem[];
  unreadCount: number;
};

export function NotificationCenter({
  notifications,
  unreadCount,
}: Props) {
  const [
    isOpen,
    setIsOpen,
  ] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent
    ) {
      if (
        !containerRef.current
      ) {
        return;
      }

      if (
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <NotificationBell
        unreadCount={
          unreadCount
        }
        isOpen={
          isOpen
        }
        onClick={() =>
          setIsOpen(
            (current) =>
              !current
          )
        }
      />

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[100]">
          <NotificationDropdown
            notifications={
              notifications
            }
            onClose={() =>
              setIsOpen(false)
            }
          />
        </div>
      )}
    </div>
  );
}