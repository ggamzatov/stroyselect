"use client";

import {
  ChatAttachment,
  type ChatAttachmentData,
} from "@/features/chat/components/chat-attachment";

export type ChatSender = {
  id: string;
  first_name: string;
  last_name: string | null;
  role: string;
};

export type RepliedChatMessage = {
  id: string;
  sender_id: string;
  message_text: string;
  is_deleted: boolean;
  created_at: string;
  

  sender:
    | ChatSender
    | ChatSender[]
    | null;
};

export type ChatMessageData = {
  id: string;
  project_id: string;
  sender_id: string;
  message_text: string;

  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;

  reply_to_id: string | null;
  edited_at: string | null;
  created_at: string;

  sender:
    | ChatSender
    | ChatSender[]
    | null;

  replied_message:
    | RepliedChatMessage
    | RepliedChatMessage[]
    | null;

  attachments?: ChatAttachmentData[];
};


type Props = {
  message: ChatMessageData;
  currentUserId: string;
  recipientLastReadAt: string | null;

  onReply: (
    message: ChatMessageData
  ) => void;

  onEdit: (
  message: ChatMessageData
) => void;

onDelete: (
  message: ChatMessageData
) => void;

  onOpenReply: (
    messageId: string
  ) => void;

  registerElement: (
    messageId: string,
    element: HTMLElement | null
  ) => void;
  
};

export function ChatMessage({
  message,
  currentUserId,
  recipientLastReadAt,
  onReply,
  onEdit,
  onDelete,
  onOpenReply,
  registerElement,
}: Props) {

  const sender =
    getSender(message.sender);

  const repliedMessage =
    getRepliedMessage(
      message.replied_message
    );

  const repliedSender =
    getSender(
      repliedMessage?.sender ?? null
    );

  const isOwn =
    message.sender_id ===
    currentUserId;

  const isRead =
    isOwn &&
    recipientLastReadAt !== null &&
    new Date(message.created_at) <=
      new Date(recipientLastReadAt);

  return (
    <article
      ref={(element) =>
        registerElement(
          message.id,
          element
        )
      }
      className={
        isOwn
          ? "flex justify-end transition"
          : "flex justify-start transition"
      }
    >
      <div
        className={
          isOwn
            ? "max-w-[85%] rounded-2xl rounded-br-md bg-blue-700 px-4 py-3 text-white sm:max-w-[70%]"
            : "max-w-[85%] rounded-2xl rounded-bl-md border bg-white px-4 py-3 text-slate-900 sm:max-w-[70%]"
        }
      >
        {!isOwn && (
          <p className="mb-1 text-xs font-semibold text-blue-700">
            {getSenderName(sender)}
          </p>
        )}

        {repliedMessage && (
          <button
            type="button"
            onClick={() =>
              onOpenReply(
                repliedMessage.id
              )
            }
            className={
              isOwn
                ? "mb-3 block w-full rounded-lg border-l-4 border-blue-200 bg-blue-800/40 px-3 py-2 text-left"
                : "mb-3 block w-full rounded-lg border-l-4 border-blue-600 bg-slate-50 px-3 py-2 text-left"
            }
          >
            <p
              className={
                isOwn
                  ? "text-xs font-semibold text-blue-100"
                  : "text-xs font-semibold text-blue-700"
              }
            >
              {getSenderName(
                repliedSender
              )}
            </p>

            <p
              className={
                isOwn
                  ? "mt-1 line-clamp-2 text-xs text-blue-50"
                  : "mt-1 line-clamp-2 text-xs text-slate-600"
              }
            >
              {repliedMessage.is_deleted
                ? "🗑 Сообщение удалено"
                : repliedMessage.message_text ||
                    "Вложение"}
            </p>
          </button>
        )}

       {message.is_deleted ? (
  <p
    className={
      isOwn
        ? "text-sm italic text-blue-100"
        : "text-sm italic text-slate-500"
    }
  >
    🗑 Сообщение удалено
  </p>
) : (
  <>
    {message.message_text && (
      <p className="whitespace-pre-wrap break-words text-sm leading-6">
        {message.message_text}
      </p>
    )}

    {(message.attachments?.length ??
      0) > 0 && (
      <div className="space-y-3">
        {message.attachments?.map(
          (attachment) => (
            <ChatAttachment
              key={attachment.id}
              attachment={attachment}
            />
          )
        )}
      </div>
    )}
  </>
)}

        <div
          className={
            isOwn
              ? "mt-2 flex flex-wrap items-center justify-end gap-2 text-[11px] text-blue-100"
              : "mt-2 flex flex-wrap items-center justify-end gap-2 text-[11px] text-slate-400"
          }
        >
          {message.edited_at && (
            <span>изменено</span>
          )}

          <time
            dateTime={
              message.created_at
            }
          >
            {formatMessageTime(
              message.created_at
            )}
          </time>

          {isOwn && (
            <span>
              {isRead
                ? "✓✓ Прочитано"
                : "✓ Отправлено"}
            </span>
          )}

          {!message.is_deleted && (
  <button
    type="button"
    onClick={() =>
      onReply(message)
    }
    className={
      isOwn
        ? "font-semibold text-blue-100 hover:text-white"
        : "font-semibold text-blue-700 hover:text-blue-900"
    }
  >
    Ответить
  </button>
)}

{isOwn &&
  !message.is_deleted &&
  message.message_text.trim() && (
    <button
      type="button"
      onClick={() =>
        onEdit(message)
      }
      className="font-semibold text-blue-100 hover:text-white"
    >
      Изменить
    </button>
  )}

{isOwn &&
  !message.is_deleted && (
    <button
      type="button"
      onClick={() =>
        onDelete(message)
      }
      className="font-semibold text-red-200 hover:text-white"
    >
      Удалить
    </button>
  )}
        </div>
      </div>
    </article>
  );
}

function getSender(
  value:
    | ChatSender
    | ChatSender[]
    | null
): ChatSender | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getRepliedMessage(
  value:
    | RepliedChatMessage
    | RepliedChatMessage[]
    | null
): RepliedChatMessage | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getSenderName(
  sender: ChatSender | null
) {
  if (!sender) {
    return "Пользователь";
  }

  const name = [
    sender.first_name,
    sender.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  if (name) {
    return name;
  }

  return sender.role ===
    "contractor"
    ? "Подрядчик"
    : "Заказчик";
}

function formatMessageTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}