"use server";

import { createClient } from "@/lib/supabase/server";

export async function readAllNotifications() {
  const supabase =
    await createClient();

  const { error } =
    await supabase.rpc(
      "mark_all_notifications_read"
    );

  if (error) {
    return {
      success: false,
      message:
        error.message,
    };
  }

  return {
    success: true,
    message:
      "Все уведомления прочитаны",
    };
}