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
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Необходимо войти"
    );
  }

  /*
   * Загружаем сообщения без self-join,
   * чтобы не зависеть от schema cache PostgREST.
   */
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
        is_deleted,
        deleted_at,
        deleted_by,
        reply_to_id,
        edited_at,
        created_at,

        sender:profiles!project_messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          role
        ),

        attachments:project_message_files (
          id,
          project_id,
          message_id,
          uploaded_by,
          storage_bucket,
          storage_path,
          original_name,
          mime_type,
          size_bytes,
          file_category,
          created_at
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

  const rawMessages =
    messagesResult.data ?? [];

  const readStates =
    readsResult.data ?? [];

  /*
   * Собираем ID сообщений,
   * на которые были сделаны ответы.
   */
  const repliedMessageIds = [
    ...new Set(
      rawMessages
        .map(
          (message) =>
            message.reply_to_id
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    ),
  ];

  /*
   * Загружаем цитируемые сообщения
   * отдельным запросом.
   */
  let repliedMessages: Array<{
    id: string;
    sender_id: string;
    message_text: string;
    is_deleted: boolean;
    created_at: string;
    sender:
      | {
          id: string;
          first_name: string;
          last_name: string | null;
          role: string;
        }
      | Array<{
          id: string;
          first_name: string;
          last_name: string | null;
          role: string;
        }>
      | null;
  }> = [];

  if (repliedMessageIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("project_messages")
      .select(`
        id,
        sender_id,
        message_text,
        is_deleted,
        created_at,

        sender:profiles!project_messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .in("id", repliedMessageIds);

    if (error) {
      console.error(
        "Ошибка загрузки цитируемых сообщений:",
        error
      );
    } else {
      repliedMessages =
        data ?? [];
    }
  }

  const repliedMessagesMap =
    new Map(
      repliedMessages.map(
        (message) => [
          message.id,
          message,
        ]
      )
    );

  /*
   * Собираем пути вложений.
   */
  const storagePaths =
    rawMessages.flatMap(
      (message) =>
        (
          message.attachments ??
          []
        )
          .map(
            (attachment) =>
              attachment.storage_path
          )
          .filter(
            (
              path
            ): path is string =>
              Boolean(path)
          )
    );

  /*
   * Создаём временные ссылки
   * для приватного bucket.
   */
  const signedUrlMap =
    new Map<string, string>();

  if (storagePaths.length > 0) {
    const {
      data: signedFiles,
      error: signedFilesError,
    } = await supabase.storage
      .from("chat-files")
      .createSignedUrls(
        storagePaths,
        60 * 60
      );

    if (signedFilesError) {
      console.error(
        "Ошибка создания ссылок на вложения:",
        signedFilesError
      );
    } else {
      for (
        const signedFile of
        signedFiles ?? []
      ) {
        if (
          signedFile.path &&
          signedFile.signedUrl
        ) {
          signedUrlMap.set(
            signedFile.path,
            signedFile.signedUrl
          );
        }
      }
    }
  }

  /*
   * Добавляем цитату и signed_url
   * к каждому сообщению.
   */
  const messages =
    rawMessages.map(
      (message) => ({
        ...message,

        replied_message:
          message.reply_to_id
            ? repliedMessagesMap.get(
                message.reply_to_id
              ) ?? null
            : null,

        attachments:
          (
            message.attachments ??
            []
          ).map(
            (attachment) => ({
              ...attachment,

              signed_url:
                signedUrlMap.get(
                  attachment.storage_path
                ) ?? null,
            })
          ),
      })
    );

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
    currentUserReadState
      ?.last_read_at ?? null;

  const unreadCount =
    messages.filter(
      (message) =>
        message.sender_id !==
          user.id &&
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