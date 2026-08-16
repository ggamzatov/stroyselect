"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export async function saveNotificationPreferences(formData: FormData) {
  const auth = await requireActiveUser();
  if (!auth.success) return;

  const value = (name: string) => String(formData.get(name) ?? "") === "on";
  await db.query(
    `
      INSERT INTO public.notification_preferences(
        user_id,in_app_enabled,email_enabled,project_updates,bid_updates,
        chat_updates,dispute_updates,marketing_enabled,updated_at
      ) VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,now())
      ON CONFLICT(user_id) DO UPDATE SET
        in_app_enabled=EXCLUDED.in_app_enabled,
        email_enabled=EXCLUDED.email_enabled,
        project_updates=EXCLUDED.project_updates,
        bid_updates=EXCLUDED.bid_updates,
        chat_updates=EXCLUDED.chat_updates,
        dispute_updates=EXCLUDED.dispute_updates,
        marketing_enabled=EXCLUDED.marketing_enabled,
        updated_at=now()
    `,
    [
      auth.user.id,
      value("inAppEnabled"),
      value("emailEnabled"),
      value("projectUpdates"),
      value("bidUpdates"),
      value("chatUpdates"),
      value("disputeUpdates"),
      value("marketingEnabled"),
    ]
  );
  revalidatePath("/notification-settings");
}
