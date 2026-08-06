"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from
  "@/lib/supabase/server";

const deleteProjectMessageSchema =
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
  });

type DeleteProjectMessageInput =
  z.infer<
    typeof deleteProjectMessageSchema
  >;

export type DeleteProjectMessageResult = {
  success: boolean;
  message: string;
};

export async function deleteProjectMessage(
  input: DeleteProjectMessageInput
): Promise<DeleteProjectMessageResult> {
  const parsed =
    deleteProjectMessageSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]
          ?.message ??
        "Проверьте данные сообщения",
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
      is_deleted
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
      success: true,
      message:
        "Сообщение уже удалено",
    };
  }

  /*
   * Сначала получаем вложения,
   * чтобы удалить файлы из Storage.
   */
  const {
    data: attachments,
    error: attachmentsError,
  } = await supabase
    .from("project_message_files")
    .select(`
      id,
      storage_bucket,
      storage_path
    `)
    .eq("message_id", messageId)
    .eq("project_id", projectId);

  if (attachmentsError) {
    console.error(
      "Ошибка загрузки вложений сообщения:",
      attachmentsError
    );

    return {
      success: false,
      message:
        "Не удалось проверить вложения сообщения",
    };
  }

  const groupedPaths =
    new Map<
      string,
      string[]
    >();

  for (
    const attachment of
    attachments ?? []
  ) {
    const bucket =
      attachment.storage_bucket ||
      "chat-files";

    const paths =
      groupedPaths.get(bucket) ??
      [];

    paths.push(
      attachment.storage_path
    );

    groupedPaths.set(
      bucket,
      paths
    );
  }

  /*
   * Удаляем файлы из Storage.
   */
  for (
    const [
      bucket,
      paths,
    ] of groupedPaths
  ) {
    if (paths.length === 0) {
      continue;
    }

    const {
      error: storageError,
    } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (storageError) {
      console.error(
        "Ошибка удаления вложений из Storage:",
        storageError
      );

      return {
        success: false,
        message:
          "Не удалось удалить вложения сообщения",
      };
    }
  }

  /*
   * Удаляем записи о вложениях.
   */
  if (
    (attachments ?? []).length > 0
  ) {
    const {
      error: filesDeleteError,
    } = await supabase
      .from("project_message_files")
      .delete()
      .eq("message_id", messageId)
      .eq("project_id", projectId)
      .eq("uploaded_by", user.id);

    if (filesDeleteError) {
      console.error(
        "Ошибка удаления записей вложений:",
        filesDeleteError
      );

      return {
        success: false,
        message:
          "Файлы удалены из хранилища, но не удалось удалить их записи",
      };
    }
  }

  const deletedAt =
    new Date().toISOString();

  const {
    data: deletedMessage,
    error: updateError,
  } = await supabase
    .from("project_messages")
    .update({
    message_text: "Сообщение удалено",
    is_deleted: true,
    deleted_at: deletedAt,
    deleted_by: user.id,
    edited_at: null,
    })
    .eq("id", messageId)
    .eq("project_id", projectId)
    .eq("sender_id", user.id)
    .eq("is_deleted", false)
    .select("id")
    .maybeSingle();

  if (
    updateError ||
    !deletedMessage
  ) {
    console.error(
      "Ошибка мягкого удаления сообщения:",
      updateError
    );

    return {
      success: false,
      message:
        "Не удалось удалить сообщение",
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
    message: "Сообщение удалено",
  };
}