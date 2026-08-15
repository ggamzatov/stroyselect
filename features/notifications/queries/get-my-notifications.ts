"use server";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";
import type { NotificationItem } from "../types";

type NotificationRow = Omit<NotificationItem, "actor" | "created_at" | "read_at"> & {
  created_at: Date | string;
  read_at: Date | string | null;
  actor_first_name: string | null;
  actor_last_name: string | null;
};

export async function getMyNotifications(limit = 20) {
  const userId = await getCurrentSessionUserId();
  if (!userId) return { notifications: [], unreadCount: 0 };

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

  try {
    const [itemsResult, countResult] = await Promise.all([
      db.query<NotificationRow>(
        `
          SELECT
            n.id,
            n.user_id,
            n.actor_id,
            n.notification_type,
            n.title,
            n.body,
            n.project_id,
            n.message_id,
            n.url,
            n.metadata,
            n.is_read,
            n.read_at,
            n.created_at,
            p.first_name AS actor_first_name,
            p.last_name AS actor_last_name
          FROM public.notifications n
          LEFT JOIN public.profiles p ON p.id = n.actor_id
          WHERE n.user_id = $1
          ORDER BY n.created_at DESC
          LIMIT $2
        `,
        [userId, safeLimit]
      ),
      db.query<{ count: string | number }>(
        `SELECT COUNT(*) AS count FROM public.notifications WHERE user_id = $1 AND is_read = false`,
        [userId]
      ),
    ]);

    const notifications: NotificationItem[] = itemsResult.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      actor_id: row.actor_id,
      notification_type: row.notification_type,
      title: row.title,
      body: row.body,
      project_id: row.project_id,
      message_id: row.message_id,
      url: row.url,
      metadata: row.metadata ?? {},
      is_read: row.is_read,
      read_at: row.read_at ? toIsoString(row.read_at) : null,
      created_at: toIsoString(row.created_at),
      actor: row.actor_id
        ? {
            id: row.actor_id,
            first_name: row.actor_first_name,
            last_name: row.actor_last_name,
          }
        : null,
    }));

    return {
      notifications,
      unreadCount: Number(countResult.rows[0]?.count ?? 0),
    };
  } catch (error) {
    console.error("Ошибка загрузки уведомлений:", error);
    return { notifications: [], unreadCount: 0 };
  }
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
