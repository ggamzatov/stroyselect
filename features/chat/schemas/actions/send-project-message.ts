"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import {
  projectMessageSchema,
  type ProjectMessageInput,
} from
  "@/features/chat/schemas/project-message-schema";

export type SendProjectMessageResult = {
  success: boolean;
  message: string;
  messageId?: string;
};

export async function sendProjectMessage(
  input: ProjectMessageInput
): Promise<SendProjectMessageResult> {
  const parsed =
    projectMessageSchema.safeParse(
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
    projectId,
    messageText,
    replyToId,
  } = parsed.data;

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .select(`
      id,
      customer_id,
      selected_contractor_id,
      status
    `)
    .eq("id", projectId)
    .maybeSingle();

  if (
    projectError ||
    !project
  ) {
    return {
      success: false,
      message: "Проект не найден",
    };
  }

  let hasAccess =
    project.customer_id === user.id;

  if (!hasAccess) {
    const {
      data: company,
    } = await supabase
      .from(
        "contractor_companies"
      )
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    hasAccess =
      Boolean(
        company &&
          company.id ===
            project.selected_contractor_id
      );
  }

  if (!hasAccess) {
    return {
      success: false,
      message:
        "У вас нет доступа к чату этого проекта",
    };
  }

  if (replyToId) {
    const {
      data: replyMessage,
    } = await supabase
      .from("project_messages")
      .select("id")
      .eq("id", replyToId)
      .eq(
        "project_id",
        projectId
      )
      .maybeSingle();

    if (!replyMessage) {
      return {
        success: false,
        message:
          "Сообщение для ответа не найдено",
      };
    }
  }

  const {
    data: createdMessage,
    error: insertError,
  } = await supabase
    .from("project_messages")
    .insert({
      project_id: projectId,
      sender_id: user.id,
      message_text:
        messageText.trim(),

      reply_to_id:
        replyToId ?? null,
    })
    .select("id")
    .single();

  if (
    insertError ||
    !createdMessage
  ) {
    console.error(
      "Ошибка отправки сообщения:",
      insertError
    );

    return {
      success: false,
      message:
        insertError?.message ??
        "Не удалось отправить сообщение",
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
    message: "Сообщение отправлено",
    messageId:
      createdMessage.id,
  };
}