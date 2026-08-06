"use client";

import { useState } from "react";

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
  const [isImageOpen, setIsImageOpen] =
    useState(false);

  const isImage =
    attachment.mime_type.startsWith(
      "image/"
    );

  if (isImage) {
    return (
      <>
        <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-slate-100">
          {attachment.signed_url ? (
            <button
              type="button"
              onClick={() =>
                setIsImageOpen(true)
              }
              className="group block w-full"
            >
              <img
                src={
                  attachment.signed_url
                }
                alt={
                  attachment.original_name
                }
                className="max-h-80 w-full object-cover transition group-hover:opacity-90"
              />
            </button>
          ) : (
            <div className="flex min-h-40 items-center justify-center p-5 text-sm text-slate-500">
              Не удалось загрузить
              изображение
            </div>
          )}

          <AttachmentDetails
            attachment={attachment}
          />
        </div>

        {isImageOpen &&
          attachment.signed_url && (
            <ImageLightbox
              attachment={
                attachment
              }
              onClose={() =>
                setIsImageOpen(false)
              }
            />
          )}
      </>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-black/10 bg-white/95 p-4 text-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
          {getFileIcon(
            attachment.mime_type,
            attachment.file_category
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold">
            {attachment.original_name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {getFileTypeLabel(
              attachment.mime_type,
              attachment.file_category
            )}
            {" · "}
            {formatFileSize(
              attachment.size_bytes
            )}
          </p>
        </div>
      </div>

      {attachment.signed_url ? (
        <a
          href={attachment.signed_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Открыть файл
        </a>
      ) : (
        <p className="mt-4 text-xs text-red-600">
          Временная ссылка на файл
          недоступна
        </p>
      )}
    </div>
  );
}

function AttachmentDetails({
  attachment,
}: {
  attachment: ChatAttachmentData;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 text-slate-900">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {attachment.original_name}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {formatFileSize(
            attachment.size_bytes
          )}
        </p>
      </div>

      {attachment.signed_url && (
        <a
          href={attachment.signed_url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) =>
            event.stopPropagation()
          }
          className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
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
  attachment: ChatAttachmentData;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-2 text-2xl font-bold text-white hover:bg-white/25"
        aria-label="Закрыть"
      >
        ×
      </button>

      <div
        className="flex max-h-full max-w-6xl flex-col items-center"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <img
          src={
            attachment.signed_url ??
            ""
          }
          alt={
            attachment.original_name
          }
          className="max-h-[80vh] max-w-full rounded-lg object-contain"
        />

        <div className="mt-4 text-center text-white">
          <p className="font-semibold">
            {
              attachment.original_name
            }
          </p>

          <p className="mt-1 text-sm text-white/70">
            {formatFileSize(
              attachment.size_bytes
            )}
          </p>

          {attachment.signed_url && (
            <a
              href={
                attachment.signed_url
              }
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Открыть оригинал
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function getFileIcon(
  mimeType: string,
  category: string
) {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return "📄";
  }

  if (
    mimeType.includes("word") ||
    mimeType.includes(
      "wordprocessingml"
    )
  ) {
    return "📝";
  }

  if (
    mimeType.includes("excel") ||
    mimeType.includes(
      "spreadsheet"
    )
  ) {
    return "📊";
  }

  if (
    category === "archive" ||
    mimeType.includes("zip")
  ) {
    return "🗂️";
  }

  return "📎";
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
    mimeType.includes("word") ||
    mimeType.includes(
      "wordprocessingml"
    )
  ) {
    return "Документ Word";
  }

  if (
    mimeType.includes("excel") ||
    mimeType.includes(
      "spreadsheet"
    )
  ) {
    return "Таблица Excel";
  }

  if (
    category === "archive" ||
    mimeType.includes("zip")
  ) {
    return "Архив";
  }

  return "Файл";
}

function formatFileSize(
  value: number | string
) {
  const bytes = Number(value);

  if (
    !Number.isFinite(bytes) ||
    bytes < 0
  ) {
    return "Размер неизвестен";
  }

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