import { createClient } from
  "@/lib/supabase/server";

export async function getProjectMessages(
  projectId: string
) {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Необходимо войти"
    );
  }

  const [
    messagesResult,
    readsResult,
  ] = await Promise.all([
    supabase
      .from("project_messages")
      .select(`
        id,
        project_id,
        sender_id,
        message_text,
        reply_to_id,
        edited_at,
        created_at,

        sender:profiles!project_messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("project_chat_reads")
      .select(`
        project_id,
        user_id,
        last_read_message_id,
        last_read_at,
        updated_at
      `)
      .eq("project_id", projectId),
  ]);

  if (messagesResult.error) {
    console.error(
      "Ошибка загрузки сообщений:",
      messagesResult.error
    );

    throw new Error(
      "Не удалось загрузить сообщения"
    );
  }

  if (readsResult.error) {
    console.error(
      "Ошибка загрузки отметок чтения:",
      readsResult.error
    );

    throw new Error(
      "Не удалось загрузить состояние чата"
    );
  }

  const messages =
    messagesResult.data ?? [];

  const readStates =
    readsResult.data ?? [];

  const currentUserReadState =
    readStates.find(
      (item) =>
        item.user_id === user.id
    ) ?? null;

  const otherUserReadState =
    readStates.find(
      (item) =>
        item.user_id !== user.id
    ) ?? null;

  const lastReadAt =
    currentUserReadState?.last_read_at ??
    null;

  const unreadCount =
    messages.filter(
      (message) =>
        message.sender_id !== user.id &&
        (
          !lastReadAt ||
          new Date(
            message.created_at
          ) >
            new Date(lastReadAt)
        )
    ).length;

  return {
    messages,
    unreadCount,
    currentUserReadState,
    otherUserReadState,
  };
}

export type ProjectChatData =
  Awaited<
    ReturnType<
      typeof getProjectMessages
    >
  >;