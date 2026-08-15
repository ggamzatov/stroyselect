"use server";

import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getProjectChatAccess } from "@/features/chat/server/get-project-chat-access";

const schema = z.object({
  projectId: z.string().uuid(),
  isTyping: z.boolean(),
});

export async function setProjectTypingState(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false as const };

  const activeUser = await requireActiveUser();
  if (!activeUser.success) return { success: false as const };

  const access = await getProjectChatAccess(parsed.data.projectId, activeUser.user.id);
  if (!access || (!access.isCustomer && !access.isContractor)) {
    return { success: false as const };
  }

  const expiresSeconds = parsed.data.isTyping ? 5 : 0;

  await db.query(
    `
      INSERT INTO public.project_chat_typing (
        project_id, user_id, is_typing, expires_at, updated_at
      )
      VALUES ($1, $2, $3, now() + ($4 * interval '1 second'), now())
      ON CONFLICT (project_id, user_id)
      DO UPDATE SET
        is_typing = EXCLUDED.is_typing,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `,
    [parsed.data.projectId, activeUser.user.id, parsed.data.isTyping, expiresSeconds]
  );

  return { success: true as const };
}
