"use server";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

export async function readAllNotifications() {
  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  try {
    await db.query(
      `
        UPDATE public.notifications
        SET is_read = true, read_at = COALESCE(read_at, now())
        WHERE user_id = $1 AND is_read = false
      `,
      [userId]
    );

    return { success: true, message: "Все уведомления прочитаны" };
  } catch (error) {
    console.error("Ошибка отметки всех уведомлений:", error);
    return { success: false, message: "Не удалось отметить уведомления прочитанными" };
  }
}
