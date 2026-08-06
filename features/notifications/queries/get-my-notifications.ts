"use server";

import { createClient } from "@/lib/supabase/server";

import type { NotificationItem } from "../types";

export async function getMyNotifications(
  limit = 20
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      notifications: [],
      unreadCount: 0,
    };
  }

  const { data, error } =
    await supabase
      .from("notifications")
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

  if (error) {
    console.error(error);

    return {
      notifications: [],
      unreadCount: 0,
    };
  }

  return {
    notifications:
      (data ??
        []) as NotificationItem[],

    unreadCount:
      data?.filter(
        (item) => !item.is_read
      ).length ?? 0,
  };
}