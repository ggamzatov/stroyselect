import {
  ChatMessage,
  type ChatMessageData,
} from
  "@/features/chat/components/chat-message";

import { EmptyChat } from
  "@/features/chat/components/empty-chat";

type Props = {
  messages:
    ChatMessageData[];

  currentUserId: string;

  recipientLastReadAt:
    string | null;

  bottomRef:
    React.RefObject<
      HTMLDivElement | null
    >;

  onReply: (
    message:
      ChatMessageData
  ) => void;

  onEdit: (
    message:
      ChatMessageData
  ) => void;

  onDelete: (
    message:
      ChatMessageData
  ) => void;

  onOpenReply: (
    messageId: string
  ) => void;

  registerElement: (
    messageId: string,
    element:
      HTMLElement | null
  ) => void;
};

export function ChatMessageList({
  messages,
  currentUserId,
  recipientLastReadAt,
  bottomRef,
  onReply,
  onEdit,
  onDelete,
  onOpenReply,
  registerElement,
}: Props) {
  if (
    messages.length === 0
  ) {
    return (
      <EmptyChat />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {messages.map(
        (
          message,
          index
        ) => {
          const previous =
            index > 0
              ? messages[
                  index - 1
                ]
              : null;

          const showDate =
            !previous ||
            !isSameDay(
              previous.created_at,
              message.created_at
            );

          return (
            <div
              key={
                message.id
              }
            >
              {showDate && (
                <DateSeparator
                  value={
                    message.created_at
                  }
                />
              )}

              <ChatMessage
                message={
                  message
                }
                currentUserId={
                  currentUserId
                }
                recipientLastReadAt={
                  recipientLastReadAt
                }
                onReply={
                  onReply
                }
                onEdit={
                  onEdit
                }
                onDelete={
                  onDelete
                }
                onOpenReply={
                  onOpenReply
                }
                registerElement={
                  registerElement
                }
              />
            </div>
          );
        }
      )}

      <div
        ref={
          bottomRef
        }
      />
    </div>
  );
}

function DateSeparator({
  value,
}: {
  value: string;
}) {
  return (
    <div className="my-4 flex items-center justify-center sm:my-5">
      <span className="rounded-full border border-border/80 bg-card/92 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur sm:text-[11px]">
        {formatChatDate(
          value
        )}
      </span>
    </div>
  );
}

function isSameDay(
  first: string,
  second: string
) {
  const firstDate =
    new Date(first);

  const secondDate =
    new Date(second);

  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

function formatChatDate(
  value: string
) {
  const date =
    new Date(value);

  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const messageDay =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  const difference =
    today.getTime() -
    messageDay.getTime();

  const oneDay =
    24 *
    60 *
    60 *
    1000;

  if (
    difference === 0
  ) {
    return "Сегодня";
  }

  if (
    difference === oneDay
  ) {
    return "Вчера";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day:
        "numeric",

      month:
        "long",

      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    }
  ).format(date);
}