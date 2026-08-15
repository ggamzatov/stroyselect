"use server";

import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";
import { getProjectMessages } from "@/features/chat/queries/get-project-messages";

export async function getProjectChatState(projectId: string) {
  try {
    const userId = await getCurrentSessionUserId();
    if (!userId) {
      return { success: false as const, message: "Необходимо войти" };
    }

    const [data, typingResult] = await Promise.all([
      getProjectMessages(projectId),
      db.query<{ exists: boolean }>(
        `
          SELECT EXISTS (
            SELECT 1
            FROM public.project_chat_typing
            WHERE project_id = $1
              AND user_id <> $2
              AND is_typing = true
              AND expires_at > now()
          ) AS exists
        `,
        [projectId, userId]
      ),
    ]);

    return {
      success: true as const,
      data,
      otherUserIsTyping: Boolean(typingResult.rows[0]?.exists),
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Не удалось обновить чат",
    };
  }
}
