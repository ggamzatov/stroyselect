"use client";

import {
  TriangleAlert,
} from "lucide-react";

import {
  type ChatMessageData,
} from
  "@/features/chat/components/chat-message";

import { ChatComposer } from
  "@/features/chat/components/chat-composer";

import { ChatHeader } from
  "@/features/chat/components/chat-header";

import { ChatMessageList } from
  "@/features/chat/components/chat-message-list";

import { ChatTypingIndicator } from
  "@/features/chat/components/chat-typing-indicator";

import { useProjectChat } from
  "@/features/chat/hooks/use-project-chat";

type Props = {
  projectId: string;

  currentUserId: string;

  initialMessages:
    ChatMessageData[];

  initialUnreadCount:
    number;

  otherUserLastReadAt:
    string | null;
};

export function ProjectChat({
  projectId,
  currentUserId,
  initialMessages,
  initialUnreadCount,
  otherUserLastReadAt,
}: Props) {
  const chat =
    useProjectChat({
      projectId,
      currentUserId,
      initialMessages,
      initialUnreadCount,
      otherUserLastReadAt,
    });

  return (
    <div className="project-chat-v2 overflow-hidden rounded-[1.4rem] border border-border bg-card shadow-[var(--shadow-card)] sm:rounded-[1.65rem]">
      <ChatHeader
        unreadCount={
          chat.unreadCount
        }
      />

      <div className="h-[min(64svh,680px)] min-h-[420px] overflow-y-auto bg-[linear-gradient(180deg,rgba(247,250,248,0.96),rgba(242,247,244,0.98))] px-3 py-4 dark:bg-[linear-gradient(180deg,rgba(16,22,19,0.98),rgba(18,26,22,0.98))] sm:min-h-[480px] sm:px-5 sm:py-5">
        <ChatMessageList
          messages={
            chat.messages
          }
          currentUserId={
            currentUserId
          }
          recipientLastReadAt={
            chat.recipientLastReadAt
          }
          bottomRef={
            chat.bottomRef
          }
          onReply={
            chat.handleReply
          }
          onEdit={
            chat.handleEdit
          }
          onDelete={
            chat.handleDelete
          }
          onOpenReply={
            chat.scrollToMessage
          }
          registerElement={
            chat.registerMessageElement
          }
        />
      </div>

      {chat.otherUserIsTyping && (
        <ChatTypingIndicator />
      )}

      {chat.errorMessage && (
        <div className="border-t border-border bg-card px-4 pt-3 sm:px-5">
          <div className="rounded-[1rem] border border-red-200 bg-red-50 p-3.5 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="text-sm font-semibold">
                  Не удалось выполнить действие
                </p>

                <p className="mt-1 text-sm leading-6 opacity-85">
                  {
                    chat.errorMessage
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border bg-card/98">
        <ChatComposer
          projectId={
            projectId
          }
          messageText={
            chat.messageText
          }
          onMessageTextChange={
            chat.setMessageText
          }
          replyingTo={
            chat.replyingTo
          }
          onCancelReply={
            chat.cancelReply
          }
          editingMessage={
            chat.editingMessage
          }
          onCancelEdit={
            chat.cancelEdit
          }
          errorMessage=""
          isPending={
            chat.isPending
          }
          textareaRef={
            chat.textareaRef
          }
          onSubmit={
            chat.handleSubmit
          }
          onTypingChange={
            chat.handleTypingChange
          }
          onAttachmentSuccess={() => {
            chat.setMessageText(
              ""
            );

            chat.cancelReply();

            if (
              chat.editingMessage
            ) {
              chat.cancelEdit();
            }

            chat.handleTypingChange(
              false
            );
          }}
        />
      </div>
    </div>
  );
}