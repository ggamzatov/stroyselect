"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from
  "@/lib/supabase/server";

const markReadSchema = z.object({
  projectId: z.string().uuid(),
  messageId: z.string().uuid(),
  messageCreatedAt: z
    .string()
    .datetime({
      offset: true,
    }),
});

type MarkReadInput = z.infer<
  typeof markReadSchema
>;

export type MarkProjectMessagesReadResult = {
  success: boolean;
  message: string;
};

export async function markProjectMessagesRead(
  input: MarkReadInput
): Promise<MarkProjectMessagesReadResult> {
  const parsed =
    markReadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Некорректные данные",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const {
    projectId,
    messageId,
    messageCreatedAt,
  } = parsed.data;

  /*
   * Проверяем, что сообщение действительно
   * относится к указанному проекту.
   */
  const {
    data: message,
    error: messageError,
  } = await supabase
    .from("project_messages")
    .select(`
      id,
      project_id,
      created_at
    `)
    .eq("id", messageId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (messageError || !message) {
    return {
      success: false,
      message: "Сообщение не найдено",
    };
  }

  /*
   * Не позволяем передать произвольное
   * будущее время через клиент.
   */
  const safeReadAt =
    new Date(message.created_at) >
    new Date(messageCreatedAt)
      ? message.created_at
      : messageCreatedAt;

  const {
    error: upsertError,
  } = await supabase
    .from("project_chat_reads")
    .upsert(
      {
        project_id: projectId,
        user_id: user.id,

        last_read_message_id:
          messageId,

        last_read_at:
          safeReadAt,

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "project_id,user_id",
      }
    );

  if (upsertError) {
    console.error(
      "Ошибка отметки сообщений:",
      upsertError
    );

    return {
      success: false,
      message:
        "Не удалось отметить сообщения прочитанными",
    };
  }

  revalidatePath(
    `/customer/work/${projectId}`
  );

  revalidatePath(
    `/contractor/work/${projectId}`
  );

  return {
    success: true,
    message:
      "Сообщения отмечены прочитанными",
  };
}