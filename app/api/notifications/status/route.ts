import { NextResponse } from "next/server";

import { getMyNotifications } from "@/features/notifications/queries/get-my-notifications";

export async function GET() {
  const result = await getMyNotifications(1);
  const latest = result.notifications[0] ?? null;

  return NextResponse.json(
    {
      latest: latest
        ? {
            id: latest.id,
            isRead: latest.is_read,
          }
        : null,
      unreadCount: result.unreadCount,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
