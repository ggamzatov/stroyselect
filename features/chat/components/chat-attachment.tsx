"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ExternalLink,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  X,
} from "lucide-react";

export type ChatAttachmentData = {
  id: string;
  project_id: string;
  message_id: string;
  uploaded_by: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number | string;
  file_category: string;
  created_at: string;
  signed_url: string | null;
};

type Props = {
  attachment: ChatAttachmentData;
};

export function ChatAttachment({
  attachment,
}: Props) {
  const [
    isImageOpen,
    setIsImageOpen,
  ] = useState(false);

  const isImage =
    attachment.mime_type.startsWith(
      "image/"
    );

  if (isImage) {
    return (
      <>
        <div className="overflow-hidden rounded-[1.15rem] border border-black/10 bg-background/90 text-foreground shadow-sm">
          {attachment.signed_url ? (
            <button
              type="button"
              onClick={() =>
                setIsImageOpen(
                  true
                )
              }
              className="group relative block w-full overflow-hidden bg-secondary/40"
            >
              <img
                src={
                  attachment.signed_url
                }
                alt={
                  attachment.original_name
                }
                className="max-h-[360px] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />

              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm">
                  <ImageIcon className="h-4 w-4" />
                  Открыть фото
                </span>
              </div>
            </button>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                <ImageIcon className="h-5 w-5" />
              </div>

              <p className="text-sm text-muted-foreground">
                Не удалось загрузить
                изображение
              </p>
            </div>
          )}

          <AttachmentDetails
            attachment={
              attachment
            }
          />
        </div>

        {isImageOpen &&
          attachment.signed_url && (
            <ImageLightbox
              attachment={
                attachment
              }
              onClose={() =>
                setIsImageOpen(
                  false
                )
              }
            />
          )}
      </>
    );
  }

  return (
    <div className="rounded-[1.15rem] border border-black/10 bg-background/95 p-4 text-foreground shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <FileTypeIcon
            mimeType={
              attachment.mime_type
            }
            category={
              attachment.file_category
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-bold leading-5">
            {
              attachment.original_name
            }
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {getFileTypeLabel(
              attachment.mime_type,
              attachment.file_category
            )}
            {" · "}
            {formatFileSize(
              attachment.size_bytes
            )}
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatDateTime(
              attachment.created_at
            )}
          </p>
        </div>
      </div>

      {attachment.signed_url ? (
        <a
          href={
            attachment.signed_url
          }
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_18px_rgba(107,70,50,0.14)] transition hover:bg-[#5c3b2a]"
        >
          <ExternalLink className="h-4 w-4" />
          Открыть файл
        </a>
      ) : (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          Временная ссылка на файл
          недоступна.
        </p>
      )}
    </div>
  );
}

function AttachmentDetails({
  attachment,
}: {
  attachment:
    ChatAttachmentData;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border bg-background/95 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {
            attachment.original_name
          }
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {formatFileSize(
            attachment.size_bytes
          )}
          {" · "}
          {formatDateTime(
            attachment.created_at
          )}
        </p>
      </div>

      {attachment.signed_url && (
        <a
          href={
            attachment.signed_url
          }
          target="_blank"
          rel="noreferrer"
          onClick={(event) =>
            event.stopPropagation()
          }
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary/50"
        >
          <ExternalLink className="h-3.5 w-3.5 text-primary" />
          Оригинал
        </a>
      )}
    </div>
  );
}

function ImageLightbox({
  attachment,
  onClose,
}: {
  attachment:
    ChatAttachmentData;

  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const oldOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        oldOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
      onClick={
        onClose
      }
    >
      <button
        type="button"
        onClick={
          onClose
        }
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Закрыть"
        title="Закрыть"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="flex max-h-full w-full max-w-6xl flex-col items-center"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex max-h-[78vh] w-full items-center justify-center">
          <img
            src={
              attachment.signed_url ??
              ""
            }
            alt={
              attachment.original_name
            }
            className="max-h-[78vh] max-w-full rounded-[1.25rem] object-contain shadow-2xl"
          />
        </div>

        <div className="mt-5 w-full max-w-2xl rounded-[1.5rem] bg-black/40 p-4 text-center text-white backdrop-blur">
          <p className="break-words font-semibold">
            {
              attachment.original_name
            }
          </p>

          <p className="mt-1 text-xs text-white/60">
            {formatFileSize(
              attachment.size_bytes
            )}
            {" · "}
            {formatDateTime(
              attachment.created_at
            )}
          </p>

          {attachment.signed_url && (
            <a
              href={
                attachment.signed_url
              }
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
            >
              <ExternalLink className="h-4 w-4" />
              Открыть оригинал
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function FileTypeIcon({
  mimeType,
  category,
}: {
  mimeType: string;
  category: string;
}) {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return (
      <FileText className="h-6 w-6" />
    );
  }

  if (
    mimeType.includes(
      "word"
    ) ||
    mimeType.includes(
      "wordprocessingml"
    )
  ) {
    return (
      <FileText className="h-6 w-6" />
    );
  }

  if (
    mimeType.includes(
      "excel"
    ) ||
    mimeType.includes(
      "spreadsheet"
    )
  ) {
    return (
      <FileSpreadsheet className="h-6 w-6" />
    );
  }

  if (
    category === "archive" ||
    mimeType.includes(
      "zip"
    )
  ) {
    return (
      <FileArchive className="h-6 w-6" />
    );
  }

  return (
    <File className="h-6 w-6" />
  );
}

function getFileTypeLabel(
  mimeType: string,
  category: string
) {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return "PDF-документ";
  }

  if (
    mimeType.includes(
      "word"
    ) ||
    mimeType.includes(
      "wordprocessingml"
    )
  ) {
    return "Документ Word";
  }

  if (
    mimeType.includes(
      "excel"
    ) ||
    mimeType.includes(
      "spreadsheet"
    )
  ) {
    return "Таблица Excel";
  }

  if (
    category ===
      "archive" ||
    mimeType.includes(
      "zip"
    )
  ) {
    return "Архив";
  }

  return "Файл";
}

function formatFileSize(
  value:
    | number
    | string
) {
  const bytes =
    Number(value);

  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes < 0
  ) {
    return "Размер неизвестен";
  }

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

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}