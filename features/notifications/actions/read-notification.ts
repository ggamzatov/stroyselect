"use server";

import { createClient } from "@/lib/supabase/server";

export async function readNotification(
  notificationId: string
) {
  const supabase =
    await createClient();

  const { error } =
    await supabase.rpc(
      "mark_notification_read",
      {
        target_notification_id:
          notificationId,
      }
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
  };
}