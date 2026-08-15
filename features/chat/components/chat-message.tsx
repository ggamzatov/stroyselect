"use client";

import {
  Check,
  CheckCheck,
  CornerUpLeft,
  Pencil,
  Trash2,
} from "lucide-react";

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
    getSender(
      message.sender
    );

  const repliedMessage =
    getRepliedMessage(
      message.replied_message
    );

  const repliedSender =
    getSender(
      repliedMessage?.sender ??
        null
    );

  const isOwn =
    message.sender_id ===
    currentUserId;

  const isRead =
    isOwn &&
    recipientLastReadAt !==
      null &&
    new Date(
      message.created_at
    ) <=
      new Date(
        recipientLastReadAt
      );

  const hasText =
    Boolean(
      message.message_text.trim()
    );

  const hasAttachments =
    (message.attachments
      ?.length ?? 0) > 0;

  return (
    <article
      ref={(element) =>
        registerElement(
          message.id,
          element
        )
      }
      className={[
        "group flex transition",
        isOwn
          ? "justify-end"
          : "justify-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[88%] sm:max-w-[74%]",
          isOwn
            ? "items-end"
            : "items-start",
        ].join(" ")}
      >
        {!isOwn && (
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-primary">
              {getSenderInitials(
                sender
              )}
            </div>

            <p className="text-xs font-semibold text-foreground">
              {getSenderName(
                sender
              )}
            </p>
          </div>
        )}

        <div
          className={[
            "relative overflow-hidden rounded-[1.35rem] px-4 py-3 shadow-sm",
            isOwn
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-card text-foreground",
          ].join(" ")}
        >
          {repliedMessage && (
            <button
              type="button"
              onClick={() =>
                onOpenReply(
                  repliedMessage.id
                )
              }
              className={[
                "mb-3 block w-full rounded-xl border-l-[3px] px-3 py-2 text-left transition",
                isOwn
                  ? "border-white/70 bg-white/10 hover:bg-white/15"
                  : "border-primary bg-secondary/60 hover:bg-secondary",
              ].join(" ")}
            >
              <p
                className={[
                  "text-xs font-semibold",
                  isOwn
                    ? "text-white/90"
                    : "text-primary",
                ].join(" ")}
              >
                {getSenderName(
                  repliedSender
                )}
              </p>

              <p
                className={[
                  "mt-1 line-clamp-2 text-xs leading-5",
                  isOwn
                    ? "text-white/70"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {repliedMessage.is_deleted
                  ? "Сообщение удалено"
                  : repliedMessage.message_text ||
                    "Вложение"}
              </p>
            </button>
          )}

          {message.is_deleted ? (
            <p
              className={[
                "text-sm italic",
                isOwn
                  ? "text-white/65"
                  : "text-muted-foreground",
              ].join(" ")}
            >
              Сообщение удалено
            </p>
          ) : (
            <>
              {hasText && (
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {message.message_text}
                </p>
              )}

              {hasAttachments && (
                <div
                  className={[
                    "space-y-3",
                    hasText
                      ? "mt-3"
                      : "",
                  ].join(" ")}
                >
                  {message.attachments?.map(
                    (
                      attachment
                    ) => (
                      <ChatAttachment
                        key={
                          attachment.id
                        }
                        attachment={
                          attachment
                        }
                      />
                    )
                  )}
                </div>
              )}
            </>
          )}

          <div
            className={[
              "mt-2 flex flex-wrap items-center justify-end gap-1.5 text-[10px]",
              isOwn
                ? "text-white/65"
                : "text-muted-foreground",
            ].join(" ")}
          >
            {message.edited_at && (
              <span>
                изменено
              </span>
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

            {isOwn &&
              !message.is_deleted && (
                <ReadStatus
                  isRead={
                    isRead
                  }
                />
              )}
          </div>
        </div>

        {!message.is_deleted && (
          <div
            className={[
              "mt-1 flex items-center gap-1 px-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100",
              isOwn
                ? "justify-end"
                : "justify-start",
            ].join(" ")}
          >
            <MessageAction
              label="Ответить"
              icon={
                <CornerUpLeft className="h-3.5 w-3.5" />
              }
              onClick={() =>
                onReply(
                  message
                )
              }
            />

            {isOwn &&
              hasText && (
                <MessageAction
                  label="Изменить"
                  icon={
                    <Pencil className="h-3.5 w-3.5" />
                  }
                  onClick={() =>
                    onEdit(
                      message
                    )
                  }
                />
              )}

            {isOwn && (
              <MessageAction
                label="Удалить"
                destructive
                icon={
                  <Trash2 className="h-3.5 w-3.5" />
                }
                onClick={() =>
                  onDelete(
                    message
                  )
                }
              />
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function MessageAction({
  label,
  icon,
  onClick,
  destructive = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition",
        destructive
          ? "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function ReadStatus({
  isRead,
}: {
  isRead: boolean;
}) {
  return (
    <span
      className="inline-flex items-center"
      title={
        isRead
          ? "Прочитано"
          : "Отправлено"
      }
    >
      {isRead ? (
        <CheckCheck className="h-3.5 w-3.5" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
    </span>
  );
}

function getSender(
  value:
    | ChatSender
    | ChatSender[]
    | null
): ChatSender | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

function getRepliedMessage(
  value:
    | RepliedChatMessage
    | RepliedChatMessage[]
    | null
): RepliedChatMessage | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

function getSenderName(
  sender:
    | ChatSender
    | null
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

function getSenderInitials(
  sender:
    | ChatSender
    | null
) {
  if (!sender) {
    return "П";
  }

  const first =
    sender.first_name
      ?.trim()
      .charAt(0);

  const last =
    sender.last_name
      ?.trim()
      .charAt(0);

  const initials =
    `${first ?? ""}${last ?? ""}`;

  if (initials) {
    return initials.toUpperCase();
  }

  return sender.role ===
    "contractor"
    ? "П"
    : "З";
}

function formatMessageTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(
    new Date(value)
  );
}
