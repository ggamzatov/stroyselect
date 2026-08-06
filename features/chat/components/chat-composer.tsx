"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

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

  return (
    <form
      onSubmit={onSubmit}
      className="border-t p-4 sm:p-5"
    >
      {errorMessage && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {editingMessage && (
        <div className="mb-3 flex items-start justify-between gap-4 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-700">
              Редактирование сообщения
            </p>

            <p className="mt-1 truncate text-sm text-slate-700">
              {
                editingMessage
                  .message_text
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleCancelEdit
            }
            className="shrink-0 rounded-lg px-2 py-1 text-lg font-semibold text-slate-500 hover:bg-white hover:text-slate-900"
            aria-label="Отменить редактирование"
            title="Отменить редактирование"
          >
            ×
          </button>
        </div>
      )}

      {replyingTo &&
        !editingMessage && (
          <div className="mb-3 flex items-start justify-between gap-4 rounded-xl border-l-4 border-blue-700 bg-blue-50 p-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700">
                Ответ на сообщение
              </p>

              <p className="mt-1 truncate text-sm text-slate-700">
                {replyingTo
                  .message_text ||
                  "Вложение"}
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleCancelReply
              }
              className="shrink-0 rounded-lg px-2 py-1 text-lg font-semibold text-slate-500 hover:bg-white hover:text-slate-900"
              aria-label="Отменить ответ"
              title="Отменить ответ"
            >
              ×
            </button>
          </div>
        )}

      <div className="flex items-end gap-3">
        {!editingMessage && (
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
          rows={2}
          maxLength={5000}
          placeholder={
            editingMessage
              ? "Измените сообщение..."
              : replyingTo
                ? "Напишите ответ..."
                : "Напишите сообщение..."
          }
          className="min-h-12 flex-1 resize-none rounded-xl border p-3 outline-none focus:border-blue-500"
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
          className="h-12 rounded-xl bg-blue-700 px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "..."
            : editingMessage
              ? "Сохранить"
              : "Отправить"}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Enter — отправить, Shift +
        Enter — новая строка,
        Esc — отменить.
      </p>
    </form>
  );
}