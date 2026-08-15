"use server";

import { getProjectMessages } from "@/features/chat/queries/get-project-messages";

export async function getProjectChatState(projectId: string) {
  try {
    const data = await getProjectMessages(projectId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Не удалось обновить чат",
    };
  }
}
