"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from
  "@/lib/supabase/client";

import { sendProjectMessage } from
  "@/features/chat/actions/send-project-message";

import { markProjectMessagesRead } from
  "@/features/chat/actions/mark-project-messages-read";

import { editProjectMessage } from
  "@/features/chat/actions/edit-project-message";

import { deleteProjectMessage } from
  "@/features/chat/actions/delete-project-message";

import { ChatComposer } from
  "@/features/chat/components/chat-composer";

import {
  ChatMessage,
  type ChatMessageData,
} from
  "@/features/chat/components/chat-message";

type Props = {
  projectId: string;
  currentUserId: string;
  initialMessages: ChatMessageData[];
  initialUnreadCount: number;
  otherUserLastReadAt: string | null;
};

export function ProjectChat({
  projectId,
  currentUserId,
  initialMessages,
  initialUnreadCount,
  otherUserLastReadAt,
}: Props) {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const messageRefs =
    useRef<
      Map<string, HTMLElement>
    >(new Map());

  const lastMarkedMessageIdRef =
    useRef<string | null>(null);

  const typingChannelRef =
    useRef<
      ReturnType<
        typeof supabase.channel
      > | null
    >(null);

  const typingTimeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const otherTypingTimeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const isTypingSentRef =
    useRef(false);

  const [
    messages,
    setMessages,
  ] = useState<
    ChatMessageData[]
  >(initialMessages);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(
    initialUnreadCount
  );

  const [
    recipientLastReadAt,
    setRecipientLastReadAt,
  ] = useState<string | null>(
    otherUserLastReadAt
  );

  const [
    messageText,
    setMessageText,
  ] = useState("");

  const [
    replyingTo,
    setReplyingTo,
  ] =
    useState<ChatMessageData | null>(
      null
    );

  const [
    editingMessage,
    setEditingMessage,
  ] =
    useState<ChatMessageData | null>(
      null
    );

  const [
    deletingMessageId,
    setDeletingMessageId,
  ] = useState<string | null>(
    null
  );

  const [
    otherUserIsTyping,
    setOtherUserIsTyping,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setUnreadCount(
      initialUnreadCount
    );
  }, [initialUnreadCount]);

  useEffect(() => {
    setRecipientLastReadAt(
      otherUserLastReadAt
    );
  }, [otherUserLastReadAt]);

  const lastIncomingMessage =
    useMemo(() => {
      return (
        [...messages]
          .reverse()
          .find(
            (message) =>
              message.sender_id !==
              currentUserId
          ) ?? null
      );
    }, [
      currentUserId,
      messages,
    ]);

  const markVisibleMessagesRead =
    useCallback(async () => {
      if (!lastIncomingMessage) {
        return;
      }

      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      if (
        lastMarkedMessageIdRef
          .current ===
        lastIncomingMessage.id
      ) {
        return;
      }

      lastMarkedMessageIdRef.current =
        lastIncomingMessage.id;

      const result =
        await markProjectMessagesRead({
          projectId,

          messageId:
            lastIncomingMessage.id,

          messageCreatedAt:
            lastIncomingMessage
              .created_at,
        });

      if (!result.success) {
        console.error(
          "Ошибка отметки прочтения:",
          result.message
        );

        lastMarkedMessageIdRef.current =
          null;

        return;
      }

      setUnreadCount(0);
    }, [
      lastIncomingMessage,
      projectId,
    ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "instant",
    });
  }, [messages.length]);

  useEffect(() => {
    void markVisibleMessagesRead();
  }, [markVisibleMessagesRead]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void markVisibleMessagesRead();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [markVisibleMessagesRead]);

  useEffect(() => {
    const messagesChannel =
      supabase
        .channel(
          `project-chat-messages-${projectId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "project_messages",
            filter:
              `project_id=eq.${projectId}`,
          },
          (payload) => {
            if (
              payload.eventType ===
              "INSERT"
            ) {
              const newMessage =
                payload.new as {
                  sender_id?: string;
                };

              if (
                newMessage.sender_id &&
                newMessage.sender_id !==
                  currentUserId
              ) {
                setUnreadCount(
                  (current) =>
                    current + 1
                );
              }
            }

            router.refresh();
          }
        )
        .subscribe(
          (status, error) => {
            if (error) {
              console.error(
                "Ошибка подписки сообщений:",
                status,
                error
              );
            }
          }
        );

    const readsChannel =
      supabase
        .channel(
          `project-chat-reads-${projectId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "project_chat_reads",
            filter:
              `project_id=eq.${projectId}`,
          },
          (payload) => {
            const changedReadState =
              (
                payload.new ??
                payload.old
              ) as {
                user_id?: string;
                last_read_at?: string;
              };

            if (
              changedReadState.user_id &&
              changedReadState.user_id !==
                currentUserId
            ) {
              setRecipientLastReadAt(
                changedReadState
                  .last_read_at ??
                  null
              );
            }

            router.refresh();
          }
        )
        .subscribe(
          (status, error) => {
            if (error) {
              console.error(
                "Ошибка подписки чтения:",
                status,
                error
              );
            }
          }
        );

    const typingChannel =
      supabase
        .channel(
          `project-chat-typing-${projectId}`,
          {
            config: {
              broadcast: {
                self: false,
              },
            },
          }
        )
        .on(
          "broadcast",
          {
            event: "typing",
          },
          ({ payload }) => {
            const typingPayload =
              payload as {
                userId?: string;
                isTyping?: boolean;
              };

            if (
              !typingPayload.userId ||
              typingPayload.userId ===
                currentUserId
            ) {
              return;
            }

            const isTyping =
              Boolean(
                typingPayload.isTyping
              );

            setOtherUserIsTyping(
              isTyping
            );

            if (
              otherTypingTimeoutRef.current
            ) {
              clearTimeout(
                otherTypingTimeoutRef.current
              );

              otherTypingTimeoutRef.current =
                null;
            }

            if (isTyping) {
              otherTypingTimeoutRef.current =
                setTimeout(() => {
                  setOtherUserIsTyping(
                    false
                  );
                }, 3500);
            }
          }
        )
        .subscribe(
          (status, error) => {
            if (error) {
              console.error(
                "Ошибка подписки индикатора набора:",
                status,
                error
              );
            }
          }
        );

    typingChannelRef.current =
      typingChannel;

    return () => {
      typingChannelRef.current =
        null;

      void supabase.removeChannel(
        messagesChannel
      );

      void supabase.removeChannel(
        readsChannel
      );

      void supabase.removeChannel(
        typingChannel
      );
    };
  }, [
    currentUserId,
    projectId,
    router,
    supabase,
  ]);

  useEffect(() => {
    return () => {
      if (
        typingTimeoutRef.current
      ) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }

      if (
        otherTypingTimeoutRef.current
      ) {
        clearTimeout(
          otherTypingTimeoutRef.current
        );
      }
    };
  }, []);

  function handleTypingChange(
    isTyping: boolean
  ) {
    const channel =
      typingChannelRef.current;

    if (!channel) {
      return;
    }

    if (
      typingTimeoutRef.current
    ) {
      clearTimeout(
        typingTimeoutRef.current
      );

      typingTimeoutRef.current =
        null;
    }

    if (
      isTypingSentRef.current !==
      isTyping
    ) {
      isTypingSentRef.current =
        isTyping;

      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUserId,
          isTyping,
        },
      });
    }

    if (isTyping) {
      typingTimeoutRef.current =
        setTimeout(() => {
          isTypingSentRef.current =
            false;

          void channel.send({
            type: "broadcast",
            event: "typing",
            payload: {
              userId:
                currentUserId,
              isTyping: false,
            },
          });
        }, 2500);
    }
  }

  function handleSubmit(
    event:
      React.FormEvent<
        HTMLFormElement
      >
  ) {
    event.preventDefault();

    const normalizedMessage =
      messageText.trim();

    if (!normalizedMessage) {
      setErrorMessage(
        "Введите сообщение"
      );

      return;
    }

    setErrorMessage("");

    startTransition(async () => {
      if (editingMessage) {
        const result =
          await editProjectMessage({
            messageId:
              editingMessage.id,

            projectId,

            messageText:
              normalizedMessage,
          });

        if (!result.success) {
          setErrorMessage(
            result.message
          );

          return;
        }

        setMessageText("");
        setEditingMessage(null);
        handleTypingChange(false);

        router.refresh();

        return;
      }

      const result =
        await sendProjectMessage({
          projectId,

          messageText:
            normalizedMessage,

          replyToId:
            replyingTo?.id,
        });

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setMessageText("");
      setReplyingTo(null);
      handleTypingChange(false);

      router.refresh();
    });
  }

  function handleReply(
    message: ChatMessageData
  ) {
    if (message.is_deleted) {
      return;
    }

    setReplyingTo(message);
    setEditingMessage(null);
    setErrorMessage("");

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  function handleEdit(
    message: ChatMessageData
  ) {
    if (message.is_deleted) {
      return;
    }

    setEditingMessage(message);
    setReplyingTo(null);

    setMessageText(
      message.message_text
    );

    setErrorMessage("");

    handleTypingChange(false);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  function cancelEdit() {
    setEditingMessage(null);
    setMessageText("");
    setErrorMessage("");
    handleTypingChange(false);
  }

  function cancelReply() {
    setReplyingTo(null);
    setErrorMessage("");
  }

  function handleDelete(
    message: ChatMessageData
  ) {
    if (
      message.is_deleted ||
      deletingMessageId ===
        message.id
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Удалить это сообщение? Восстановить его будет невозможно."
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");

    setDeletingMessageId(
      message.id
    );

    startTransition(async () => {
      try {
        const result =
          await deleteProjectMessage({
            messageId:
              message.id,

            projectId,
          });

        if (!result.success) {
          setErrorMessage(
            result.message
          );

          return;
        }

        if (
          replyingTo?.id ===
          message.id
        ) {
          setReplyingTo(null);
        }

        if (
          editingMessage?.id ===
          message.id
        ) {
          setEditingMessage(null);
          setMessageText("");
        }

        handleTypingChange(false);

        router.refresh();
      } finally {
        setDeletingMessageId(
          null
        );
      }
    });
  }

  function registerMessageElement(
    messageId: string,
    element: HTMLElement | null
  ) {
    if (element) {
      messageRefs.current.set(
        messageId,
        element
      );

      return;
    }

    messageRefs.current.delete(
      messageId
    );
  }

  function scrollToMessage(
    messageId: string
  ) {
    const element =
      messageRefs.current.get(
        messageId
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    element.classList.add(
      "rounded-xl",
      "ring-2",
      "ring-blue-400"
    );

    window.setTimeout(() => {
      element.classList.remove(
        "ring-2",
        "ring-blue-400"
      );
    }, 1500);
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-5">
        <div>
          <h2 className="text-xl font-semibold">
            Чат проекта
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Обсуждение работ между
            заказчиком и подрядчиком.
          </p>
        </div>

        {unreadCount > 0 && (
          <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
            Новых: {unreadCount}
          </span>
        )}
      </div>

      <div className="max-h-[520px] min-h-[320px] overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center text-center">
            <div>
              <p className="font-semibold">
                Сообщений пока нет
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Напишите первое
                сообщение по проекту.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(
              (message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  currentUserId={
                    currentUserId
                  }
                  recipientLastReadAt={
                    recipientLastReadAt
                  }
                  onReply={
                    handleReply
                  }
                  onEdit={
                    handleEdit
                  }
                  onDelete={
                    handleDelete
                  }
                  onOpenReply={
                    scrollToMessage
                  }
                  registerElement={
                    registerMessageElement
                  }
                />
              )
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {otherUserIsTyping && (
        <div className="border-t bg-white px-5 pt-3 text-sm text-slate-500">
          Собеседник печатает
          <span className="ml-1 inline-flex gap-0.5">
            <span className="animate-pulse">
              .
            </span>

            <span className="animate-pulse">
              .
            </span>

            <span className="animate-pulse">
              .
            </span>
          </span>
        </div>
      )}

      <ChatComposer
        projectId={projectId}
        messageText={messageText}
        onMessageTextChange={
          setMessageText
        }
        replyingTo={replyingTo}
        onCancelReply={
          cancelReply
        }
        editingMessage={
          editingMessage
        }
        onCancelEdit={
          cancelEdit
        }
        errorMessage={
          errorMessage
        }
        isPending={
          isPending
        }
        textareaRef={
          textareaRef
        }
        onSubmit={
          handleSubmit
        }
        onTypingChange={
          handleTypingChange
        }
        onAttachmentSuccess={() => {
          setMessageText("");
          setReplyingTo(null);
          setEditingMessage(null);
          handleTypingChange(false);
        }}
      />
    </section>
  );
}