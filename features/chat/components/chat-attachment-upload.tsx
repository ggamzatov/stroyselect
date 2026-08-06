"use client";

import {
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import { sendChatAttachment } from
  "@/features/chat/actions/send-chat-attachment";

type Props = {
  projectId: string;
  messageText: string;
  onSuccess: () => void;
};

export function ChatAttachmentUpload({
  projectId,
  messageText,
  onSuccess,
}: Props) {
  const router = useRouter();

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleFileChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    setErrorMessage("");
    setSelectedFile(file);
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setErrorMessage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function uploadFile() {
    if (!selectedFile) {
      setErrorMessage(
        "Выберите файл"
      );

      return;
    }

    const formData =
      new FormData();

    formData.set(
      "projectId",
      projectId
    );

    formData.set(
      "messageText",
      messageText
    );

    formData.set(
      "file",
      selectedFile
    );

    setErrorMessage("");

    startTransition(async () => {
      const result =
        await sendChatAttachment(
          formData
        );

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      clearSelectedFile();
      onSuccess();
      router.refresh();
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip"
        onChange={handleFileChange}
      />

      {!selectedFile ? (
        <button
          type="button"
          onClick={openFilePicker}
          className="inline-flex h-12 items-center justify-center rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          title="Прикрепить файл"
          aria-label="Прикрепить файл"
        >
          📎
        </button>
      ) : (
        <div className="rounded-xl border bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {selectedFile.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(
                  selectedFile.size
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={clearSelectedFile}
                className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Отмена
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={uploadFile}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending
                  ? "Загружаем..."
                  : "Отправить файл"}
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} Б`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} КБ`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} МБ`;
}