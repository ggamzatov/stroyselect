"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";

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
  ] = useState<File | null>(
    null
  );

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState<string | null>(
    null
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const isImage =
    selectedFile?.type.startsWith(
      "image/"
    ) ?? false;

  useEffect(() => {
    if (
      !selectedFile ||
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl =
      URL.createObjectURL(
        selectedFile
      );

    setPreviewUrl(
      objectUrl
    );

    return () => {
      URL.revokeObjectURL(
        objectUrl
      );
    };
  }, [selectedFile]);

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

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const maxSize =
      20 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      event.target.value =
        "";

      setSelectedFile(
        null
      );

      setErrorMessage(
        "Размер файла превышает 20 МБ."
      );

      return;
    }

    setSelectedFile(
      file
    );
  }

  function clearSelectedFile() {
    setSelectedFile(
      null
    );

    setErrorMessage("");

    if (
      inputRef.current
    ) {
      inputRef.current.value =
        "";
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
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip"
        onChange={
          handleFileChange
        }
      />

      {!selectedFile ? (
        <button
          type="button"
          onClick={
            openFilePicker
          }
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition hover:border-primary/25 hover:bg-secondary hover:text-primary"
          title="Прикрепить файл"
          aria-label="Прикрепить файл"
        >
          <Paperclip className="h-5 w-5" />
        </button>
      ) : (
        <div className="absolute bottom-14 left-0 z-30 w-[min(340px,calc(100vw-3rem))] overflow-hidden rounded-[1.4rem] border border-border bg-card shadow-[var(--shadow-card)]">
          {isImage &&
          previewUrl ? (
            <div className="relative bg-secondary/40">
              <img
                src={
                  previewUrl
                }
                alt="Предпросмотр вложения"
                className="max-h-64 w-full object-contain"
              />

              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  type="button"
                  disabled={
                    isPending
                  }
                  onClick={
                    openFilePicker
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/75 disabled:opacity-50"
                  title="Заменить файл"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={
                    isPending
                  }
                  onClick={
                    clearSelectedFile
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/75 disabled:opacity-50"
                  title="Убрать файл"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {
                    selectedFile.name
                  }
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatFileSize(
                    selectedFile.size
                  )}
                  {" · "}
                  {getFileTypeLabel(
                    selectedFile
                  )}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  clearSelectedFile
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                title="Убрать файл"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="border-t border-border p-4">
            {isImage && (
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <ImageIcon className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {
                      selectedFile.name
                    }
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(
                      selectedFile.size
                    )}
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />

                  <p className="text-xs leading-5">
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  clearSelectedFile
                }
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-secondary/50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Отмена
              </button>

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  uploadFile
                }
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_18px_rgba(107,70,50,0.16)] transition hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загружаем...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Отправить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(
  bytes: number
) {
  if (
    bytes < 1024
  ) {
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

function getFileTypeLabel(
  file: File
) {
  if (
    file.type.startsWith(
      "image/"
    )
  ) {
    return "Фото";
  }

  const name =
    file.name.toLowerCase();

  if (
    file.type ===
      "application/pdf" ||
    name.endsWith(".pdf")
  ) {
    return "PDF";
  }

  if (
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  ) {
    return "Word";
  }

  if (
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  ) {
    return "Excel";
  }

  if (
    name.endsWith(".zip")
  ) {
    return "ZIP";
  }

  return "Файл";
}