import "server-only";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export async function getNotificationPreferences() {
  const auth = await requireActiveUser();
  if (!auth.success) return null;
  const result = await db.query<{
    in_app_enabled: boolean;
    email_enabled: boolean;
    project_updates: boolean;
    bid_updates: boolean;
    chat_updates: boolean;
    dispute_updates: boolean;
    marketing_enabled: boolean;
  }>(
    `
      INSERT INTO public.notification_preferences(user_id)
      VALUES($1::uuid)
      ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id
      RETURNING in_app_enabled,email_enabled,project_updates,bid_updates,chat_updates,dispute_updates,marketing_enabled
    `,
    [auth.user.id]
  );
  return { userId: auth.user.id, profile: auth.profile, preferences: result.rows[0] };
}
