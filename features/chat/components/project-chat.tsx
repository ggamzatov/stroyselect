"use client";

import { MessageCircle, TriangleAlert } from "lucide-react";

import { type ChatMessageData } from "@/features/chat/components/chat-message";
import { ChatComposer } from "@/features/chat/components/chat-composer";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { ChatMessageList } from "@/features/chat/components/chat-message-list";
import { ChatTypingIndicator } from "@/features/chat/components/chat-typing-indicator";
import { useProjectChat } from "@/features/chat/hooks/use-project-chat";

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
  const chat = useProjectChat({
    projectId,
    currentUserId,
    initialMessages,
    initialUnreadCount,
    otherUserLastReadAt,
  });

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-border/80 bg-card shadow-[0_14px_40px_rgba(16,24,40,0.06)]" aria-label="Чат по проекту">
      <div className="border-b border-border/70 bg-card px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-primary">
          <MessageCircle className="h-3.5 w-3.5" />
          Связь по проекту
        </div>
        <ChatHeader unreadCount={chat.unreadCount} />
      </div>

      <div className="max-h-[620px] min-h-[380px] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(239,248,229,0.45),transparent_45%)] px-4 py-5 sm:px-6">
        <ChatMessageList
          messages={chat.messages}
          currentUserId={currentUserId}
          recipientLastReadAt={chat.recipientLastReadAt}
          bottomRef={chat.bottomRef}
          onReply={chat.handleReply}
          onEdit={chat.handleEdit}
          onDelete={chat.handleDelete}
          onOpenReply={chat.scrollToMessage}
          registerElement={chat.registerMessageElement}
        />
      </div>

      {chat.otherUserIsTyping && <ChatTypingIndicator />}

      {chat.errorMessage && (
        <div className="border-t border-border/70 bg-card px-4 pt-4 sm:px-5">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Не удалось выполнить действие</p>
                <p className="mt-1 text-sm leading-6 opacity-85">{chat.errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border/70 bg-card p-3 sm:p-4">
        <ChatComposer
          projectId={projectId}
          messageText={chat.messageText}
          onMessageTextChange={chat.setMessageText}
          replyingTo={chat.replyingTo}
          onCancelReply={chat.cancelReply}
          editingMessage={chat.editingMessage}
          onCancelEdit={chat.cancelEdit}
          errorMessage=""
          isPending={chat.isPending}
          textareaRef={chat.textareaRef}
          onSubmit={chat.handleSubmit}
          onTypingChange={chat.handleTypingChange}
          onAttachmentSuccess={() => {
            chat.setMessageText("");
            chat.cancelReply();
            if (chat.editingMessage) chat.cancelEdit();
            chat.handleTypingChange(false);
          }}
        />
      </div>
    </section>
  );
}
