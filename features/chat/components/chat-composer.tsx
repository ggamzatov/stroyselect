"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

import {
  CornerUpLeft,
  Loader2,
  Pencil,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";

import { ChatAttachmentUpload } from
  "@/features/chat/components/chat-attachment-upload";

import type { ChatMessageData } from
  "@/features/chat/components/chat-message";

type Props = {
  projectId: string;

  messageText: string;

  onMessageTextChange: (
    value: string
  ) => void;

  replyingTo:
    ChatMessageData | null;

  onCancelReply: () => void;

  editingMessage:
    ChatMessageData | null;

  onCancelEdit: () => void;

  errorMessage: string;

  isPending: boolean;

  textareaRef:
    RefObject<
      HTMLTextAreaElement | null
    >;

  onSubmit: (
    event:
      FormEvent<HTMLFormElement>
  ) => void;

  onAttachmentSuccess: () => void;

  onTypingChange: (
    isTyping: boolean
  ) => void;
};

export function ChatComposer({
  projectId,
  messageText,
  onMessageTextChange,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  errorMessage,
  isPending,
  textareaRef,
  onSubmit,
  onAttachmentSuccess,
  onTypingChange,
}: Props) {
  function handleKeyDown(
    event:
      KeyboardEvent<
        HTMLTextAreaElement
      >
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      onTypingChange(false);

      event.currentTarget
        .form
        ?.requestSubmit();

      return;
    }

    if (
      event.key === "Escape"
    ) {
      onTypingChange(false);

      if (editingMessage) {
        onCancelEdit();
        return;
      }

      if (replyingTo) {
        onCancelReply();
      }
    }
  }

  function handleMessageChange(
    value: string
  ) {
    onMessageTextChange(value);

    onTypingChange(
      value.trim().length > 0
    );
  }

  function handleCancelEdit() {
    onTypingChange(false);
    onCancelEdit();
  }

  function handleCancelReply() {
    onTypingChange(false);
    onCancelReply();
  }

  const remainingCharacters =
    5000 - messageText.length;

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card p-4 sm:p-5"
    >
      {errorMessage && (
        <div className="mb-4 rounded-[1.1rem] border border-red-200 bg-red-50 p-3.5 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />

            <p className="text-sm leading-6">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {editingMessage && (
        <ComposerContext
          variant="edit"
          title="Редактирование сообщения"
          text={
            editingMessage.message_text
          }
          onClose={
            handleCancelEdit
          }
        />
      )}

      {replyingTo &&
        !editingMessage && (
          <ComposerContext
            variant="reply"
            title="Ответ на сообщение"
            text={
              replyingTo.message_text ||
              "Вложение"
            }
            onClose={
              handleCancelReply
            }
          />
        )}

      <div className="rounded-[1.5rem] border border-border bg-background/60 p-2 transition focus-within:border-primary/30 focus-within:shadow-[0_0_0_4px_rgba(107,70,50,0.07)]">
        <div className="flex items-end gap-2">
          {!editingMessage && (
            <div className="shrink-0">
              <ChatAttachmentUpload
                projectId={
                  projectId
                }
                messageText={
                  messageText
                }
                onSuccess={() => {
                  onTypingChange(
                    false
                  );

                  onAttachmentSuccess();
                }}
              />
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={(event) =>
              handleMessageChange(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            rows={1}
            maxLength={5000}
            placeholder={
              editingMessage
                ? "Измените сообщение..."
                : replyingTo
                  ? "Напишите ответ..."
                  : "Напишите сообщение..."
            }
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />

          <button
            type="submit"
            disabled={
              isPending ||
              !messageText.trim()
            }
            onClick={() =>
              onTypingChange(false)
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(107,70,50,0.18)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-40"
            aria-label={
              editingMessage
                ? "Сохранить сообщение"
                : "Отправить сообщение"
            }
            title={
              editingMessage
                ? "Сохранить"
                : "Отправить"
            }
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingMessage ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-2 pb-1 pt-2">
          <p className="text-[11px] text-muted-foreground">
            Enter — отправить · Shift + Enter — новая строка · Esc — отменить
          </p>

          <p
            className={[
              "text-[11px]",
              remainingCharacters <
              300
                ? "font-semibold text-amber-600"
                : "text-muted-foreground",
            ].join(" ")}
          >
            {remainingCharacters}
          </p>
        </div>
      </div>
    </form>
  );
}

function ComposerContext({
  variant,
  title,
  text,
  onClose,
}: {
  variant:
    | "reply"
    | "edit";

  title: string;
  text: string;
  onClose: () => void;
}) {
  const Icon =
    variant === "reply"
      ? CornerUpLeft
      : Pencil;

  return (
    <div
      className={[
        "mb-3 flex items-start justify-between gap-4 rounded-[1.2rem] border p-3.5",
        variant === "reply"
          ? "border-primary/20 bg-secondary/50"
          : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            variant === "reply"
              ? "bg-primary text-primary-foreground"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p
            className={[
              "text-xs font-semibold",
              variant === "reply"
                ? "text-primary"
                : "text-amber-700 dark:text-amber-300",
            ].join(" ")}
          >
            {title}
          </p>

          <p className="mt-1 truncate text-sm text-muted-foreground">
            {text}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground"
        aria-label="Отменить"
        title="Отменить"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}