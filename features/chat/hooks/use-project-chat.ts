"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import { sendProjectMessage } from "@/features/chat/actions/send-project-message";
import { markProjectMessagesRead } from "@/features/chat/actions/mark-project-messages-read";
import { editProjectMessage } from "@/features/chat/actions/edit-project-message";
import { deleteProjectMessage } from "@/features/chat/actions/delete-project-message";
import { getProjectChatState } from "@/features/chat/actions/get-project-chat-state";
import { setProjectTypingState } from "@/features/chat/actions/set-project-typing-state";
import type { ChatMessageData } from "@/features/chat/components/chat-message";

type Props = {
  projectId: string;
  currentUserId: string;
  initialMessages: ChatMessageData[];
  initialUnreadCount: number;
  otherUserLastReadAt: string | null;
};

const FALLBACK_POLL_INTERVAL_MS = 30_000;

export function useProjectChat({
  projectId,
  currentUserId,
  initialMessages,
  initialUnreadCount,
  otherUserLastReadAt,
}: Props) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const lastMarkedMessageIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [recipientLastReadAt, setRecipientLastReadAt] = useState<string | null>(otherUserLastReadAt);
  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessageData | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageData | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [otherUserIsTyping, setOtherUserIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshChat = useCallback(async () => {
    if (refreshInFlightRef.current || document.visibilityState !== "visible") return;

    refreshInFlightRef.current = true;
    try {
      const result = await getProjectChatState(projectId);
      if (!result.success) return;

      setMessages(result.data.messages as ChatMessageData[]);
      setUnreadCount(result.data.unreadCount);
      setRecipientLastReadAt(result.data.otherUserReadState?.last_read_at ?? null);
      setOtherUserIsTyping(result.otherUserIsTyping);
    } catch (error) {
      console.error("Ошибка обновления чата:", error);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [projectId]);

  useEffect(() => {
    let source: EventSource | null = null;
    let fallbackTimer: number | null = null;
    let disposed = false;

    const startFallback = () => {
      if (fallbackTimer !== null) return;
      fallbackTimer = window.setInterval(() => void refreshChat(), FALLBACK_POLL_INTERVAL_MS);
    };
    const stopFallback = () => {
      if (fallbackTimer !== null) window.clearInterval(fallbackTimer);
      fallbackTimer = null;
    };

    if (typeof EventSource !== "undefined") {
      source = new EventSource(`/api/projects/${projectId}/chat/events`);
      source.addEventListener("ready", () => {
        stopFallback();
        void refreshChat();
      });
      source.addEventListener("change", () => void refreshChat());
      source.onerror = () => {
        if (!disposed) startFallback();
      };
    } else {
      startFallback();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshChat();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      source?.close();
      stopFallback();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [projectId, refreshChat]);

  const lastIncomingMessage = [...messages]
    .reverse()
    .find((message) => message.sender_id !== currentUserId) ?? null;

  const markVisibleMessagesRead = useCallback(async () => {
    if (!lastIncomingMessage || document.visibilityState !== "visible") return;
    if (lastMarkedMessageIdRef.current === lastIncomingMessage.id) return;

    lastMarkedMessageIdRef.current = lastIncomingMessage.id;

    const result = await markProjectMessagesRead({
      projectId,
      messageId: lastIncomingMessage.id,
      messageCreatedAt: lastIncomingMessage.created_at,
    });

    if (!result.success) {
      console.error("Ошибка отметки прочтения:", result.message);
      lastMarkedMessageIdRef.current = null;
      return;
    }

    setUnreadCount(0);
    void refreshChat();
  }, [lastIncomingMessage, projectId, refreshChat]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void markVisibleMessagesRead();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [markVisibleMessagesRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      void setProjectTypingState({ projectId, isTyping: false });
    };
  }, [projectId]);

  function handleTypingChange(isTyping: boolean) {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    void setProjectTypingState({ projectId, isTyping });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        void setProjectTypingState({ projectId, isTyping: false });
      }, 2500);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedMessage = messageText.trim();

    if (!normalizedMessage) {
      setErrorMessage("Введите сообщение");
      return;
    }

    setErrorMessage("");

    startTransition(async () => {
      if (editingMessage) {
        const result = await editProjectMessage({
          messageId: editingMessage.id,
          projectId,
          messageText: normalizedMessage,
        });

        if (!result.success) {
          setErrorMessage(result.message);
          return;
        }

        setMessageText("");
        setEditingMessage(null);
        handleTypingChange(false);
        await refreshChat();
        router.refresh();
        return;
      }

      const result = await sendProjectMessage({
        projectId,
        messageText: normalizedMessage,
        replyToId: replyingTo?.id,
      });

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessageText("");
      setReplyingTo(null);
      handleTypingChange(false);
      await refreshChat();
      router.refresh();
    });
  }

  function handleReply(message: ChatMessageData) {
    if (message.is_deleted) return;
    setReplyingTo(message);
    setEditingMessage(null);
    setErrorMessage("");
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleEdit(message: ChatMessageData) {
    if (message.is_deleted) return;
    setEditingMessage(message);
    setReplyingTo(null);
    setMessageText(message.message_text);
    setErrorMessage("");
    handleTypingChange(false);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
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

  function handleDelete(message: ChatMessageData) {
    if (message.is_deleted || deletingMessageId === message.id) return;

    if (!window.confirm("Удалить это сообщение? Восстановить его будет невозможно.")) return;

    setErrorMessage("");
    setDeletingMessageId(message.id);

    startTransition(async () => {
      try {
        const result = await deleteProjectMessage({
          messageId: message.id,
          projectId,
        });

        if (!result.success) {
          setErrorMessage(result.message);
          return;
        }

        if (replyingTo?.id === message.id) setReplyingTo(null);
        if (editingMessage?.id === message.id) {
          setEditingMessage(null);
          setMessageText("");
        }

        handleTypingChange(false);
        await refreshChat();
        router.refresh();
      } finally {
        setDeletingMessageId(null);
      }
    });
  }

  function registerMessageElement(messageId: string, element: HTMLElement | null) {
    if (element) messageRefs.current.set(messageId, element);
    else messageRefs.current.delete(messageId);
  }

  function scrollToMessage(messageId: string) {
    const element = messageRefs.current.get(messageId);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.add("rounded-xl", "ring-2", "ring-primary/40");
    window.setTimeout(() => {
      element.classList.remove("ring-2", "ring-primary/40");
    }, 1500);
  }

  return {
    messages,
    unreadCount,
    recipientLastReadAt,
    messageText,
    setMessageText,
    replyingTo,
    editingMessage,
    deletingMessageId,
    otherUserIsTyping,
    errorMessage,
    isPending,
    bottomRef,
    textareaRef,
    handleSubmit,
    handleReply,
    handleEdit,
    handleDelete,
    cancelEdit,
    cancelReply,
    handleTypingChange,
    scrollToMessage,
    registerMessageElement,
  };
}
