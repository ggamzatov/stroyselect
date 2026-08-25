"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useNotifications(userId: string) {
  const router = useRouter();
  const signatureRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function checkNotifications() {
      if (cancelled || inFlightRef.current || document.visibilityState !== "visible") return;

      inFlightRef.current = true;
      try {
        const response = await fetch("/api/notifications/status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = (await response.json()) as {
          latest: { id: string; isRead: boolean } | null;
          unreadCount: number;
        };

        const signature = `${result.latest?.id ?? "none"}:${result.latest?.isRead ? "1" : "0"}:${result.unreadCount}`;

        if (signatureRef.current === null) {
          signatureRef.current = signature;
          return;
        }

        if (signatureRef.current !== signature) {
          signatureRef.current = signature;
          router.refresh();
        }
      } catch (error) {
        console.error("Ошибка обновления уведомлений:", error);
      } finally {
        inFlightRef.current = false;
      }
    }

    const timer = window.setInterval(() => void checkNotifications(), 10_000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void checkNotifications();
    }

    function handleFocus() {
      void checkNotifications();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    void checkNotifications();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [router, userId]);
}
