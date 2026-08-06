"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from
  "@/lib/supabase/server";

const editProjectMessageSchema =
  z.object({
    messageId: z
      .string()
      .uuid(
        "Некорректный идентификатор сообщения"
      ),

    projectId: z
      .string()
      .uuid(
        "Некорректный идентификатор проекта"
      ),

    messageText: z
      .string()
      .trim()
      .min(
        1,
        "Сообщение не может быть пустым"
      )
      .max(
        5000,
        "Сообщение слишком длинное"
      ),
  });

type EditProjectMessageInput =
  z.infer<
    typeof editProjectMessageSchema
  >;

export type EditProjectMessageResult = {
  success: boolean;
  message: string;
};

export async function editProjectMessage(
  input: EditProjectMessageInput
): Promise<EditProjectMessageResult> {
  const parsed =
    editProjectMessageSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте сообщение",
    };
  }

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const {
    messageId,
    projectId,
    messageText,
  } = parsed.data;

  const {
    data: existingMessage,
    error: messageError,
  } = await supabase
    .from("project_messages")
    .select(`
      id,
      project_id,
      sender_id,
      message_text,
      is_deleted,
      created_at
    `)
    .eq("id", messageId)
    .eq("project_id", projectId)
    .eq("sender_id", user.id)
    .maybeSingle();

  if (
    messageError ||
    !existingMessage
  ) {
    return {
      success: false,
      message:
        "Сообщение не найдено или недоступно",
    };
  }
    if (existingMessage.is_deleted) {
    return {
        success: false,
        message:
        "Удалённое сообщение нельзя изменить",
    };
    }
  const normalizedText =
    messageText.trim();

  if (
    normalizedText ===
    existingMessage.message_text
  ) {
    return {
      success: true,
      message:
        "Изменений в сообщении нет",
    };
  }

  const {
    data: updatedMessage,
    error: updateError,
  } = await supabase
    .from("project_messages")
    .update({
      message_text:
        normalizedText,

      edited_at:
        new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("project_id", projectId)
    .eq("sender_id", user.id)
    .select("id")
    .maybeSingle();

  if (
    updateError ||
    !updatedMessage
  ) {
    console.error(
      "Ошибка редактирования сообщения:",
      updateError
    );

    return {
      success: false,
      message:
        "Не удалось изменить сообщение",
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
    message: "Сообщение изменено",
  };
}