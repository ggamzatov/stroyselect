"use client";

import {
  useEffect,
  useRef,
} from "react";

import { useRouter } from
  "next/navigation";

import { createClient } from
  "@/lib/supabase/client";

export function useNotifications(
  userId: string
) {
  const router = useRouter();

  const instanceIdRef =
    useRef<string | null>(null);

  if (!instanceIdRef.current) {
    instanceIdRef.current =
      crypto.randomUUID();
  }

  useEffect(() => {
    if (!userId) {
      return;
    }

    const supabase =
      createClient();

    const channelName =
      `notifications-${userId}-${instanceIdRef.current}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter:
            `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log(
            "Realtime уведомлений:",
            payload.eventType
          );

          router.refresh();
        }
      )
      .subscribe(
        (status, error) => {
          if (
            status ===
            "SUBSCRIBED"
          ) {
            console.log(
              "Подписка уведомлений активна:",
              channelName
            );
          }

          if (
            status ===
              "CHANNEL_ERROR" ||
            status ===
              "TIMED_OUT"
          ) {
            console.error(
              "Ошибка подписки уведомлений:",
              {
                status,
                error,
                channelName,
              }
            );
          }
        }
      );

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    router,
    userId,
  ]);
}