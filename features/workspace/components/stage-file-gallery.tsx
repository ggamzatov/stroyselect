"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import { deleteStageFile } from
  "@/features/workspace/actions/delete-stage-file";

type StageFile = {
  id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number | string;
  mime_type: string;
  file_category: string;
  description: string | null;
  created_at: string;
  signed_url: string | null;
};

type Props = {
  projectId: string;
  files: StageFile[];
  currentUserId: string;
  allowDelete?: boolean;
};

export function StageFileGallery({
  projectId,
  files,
  currentUserId,
  allowDelete = false,
}: Props) {
  const router = useRouter();

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    pendingFileId,
    setPendingFileId,
  ] = useState<string | null>(
    null
  );

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function handleDelete(
    file: StageFile
  ) {
    const confirmed =
      window.confirm(
        `Удалить файл «${file.file_name}»?`
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setPendingFileId(file.id);

    startTransition(async () => {
      try {
        const result =
          await deleteStageFile(
            file.id,
            projectId
          );

        if (!result.success) {
          setErrorMessage(
            result.message
          );
          return;
        }

        router.refresh();
      } finally {
        setPendingFileId(null);
      }
    });
  }

  if (files.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        Материалы пока не загружены.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {errorMessage && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {files.map((file) => {
          const isImage =
            file.mime_type.startsWith(
              "image/"
            );

          const canDelete =
            allowDelete &&
            file.uploaded_by ===
              currentUserId;

          return (
            <article
              key={file.id}
              className="overflow-hidden rounded-xl border bg-white"
            >
              {isImage &&
              file.signed_url ? (
                <a
                  href={file.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={file.signed_url}
                    alt={file.file_name}
                    className="h-44 w-full object-cover"
                  />
                </a>
              ) : (
                <div className="flex h-32 items-center justify-center bg-slate-100 px-4 text-center">
                  <span className="text-sm font-semibold text-slate-700">
                    {getFileTypeLabel(
                      file.mime_type
                    )}
                  </span>
                </div>
              )}

              <div className="p-4">
                <p className="break-words font-semibold">
                  {file.file_name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {getCategoryLabel(
                    file.file_category
                  )}
                  {" · "}
                  {formatFileSize(
                    file.file_size
                  )}
                </p>

                {file.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                    {file.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {file.signed_url && (
                    <a
                      href={
                        file.signed_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border px-3 py-2 text-sm font-semibold"
                    >
                      Открыть
                    </a>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handleDelete(file)
                      }
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      {pendingFileId ===
                      file.id
                        ? "Удаляем..."
                        : "Удалить"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getCategoryLabel(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    before_photo:
      "Фото до начала",

    progress_photo:
      "Фото процесса",

    after_photo:
      "Фото результата",

    document: "Документ",
    invoice: "Чек или счёт",
    other: "Другое",
  };

  return labels[value] ?? value;
}

function getFileTypeLabel(
  mimeType: string
) {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return "PDF-документ";
  }

  if (
    mimeType.includes("word")
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

  return "Файл";
}

function formatFileSize(
  value: number | string
) {
  const bytes = Number(value);

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