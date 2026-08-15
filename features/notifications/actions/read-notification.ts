"use server";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

export async function readNotification(notificationId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) return { success: false, message: "Необходимо войти" };

  try {
    const result = await db.query<{ id: string }>(
      `
        UPDATE public.notifications
        SET is_read = true, read_at = COALESCE(read_at, now())
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
      [notificationId, userId]
    );

    if (!result.rows[0]) {
      return { success: false, message: "Уведомление не найдено" };
    }

    return { success: true };
  } catch (error) {
    console.error("Ошибка отметки уведомления:", error);
    return { success: false, message: "Не удалось отметить уведомление прочитанным" };
  }
}
