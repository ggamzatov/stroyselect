import {
  ExternalLink,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";

import type {
  StageFile,
} from
  "@/features/workspace/types/stage-file";

import {
  formatFileDateTime,
  formatFileSize,
  getCategoryLabel,
  getFileTypeLabel,
  isImageFile,
} from
  "@/features/workspace/utils/stage-file-utils";

type Props = {
  file: StageFile;
  canDelete: boolean;
  isDeleting: boolean;
  onOpenImage: () => void;
  onDelete: () => void;
};

export function StageFileCard({
  file,
  canDelete,
  isDeleting,
  onOpenImage,
  onDelete,
}: Props) {
  const isImage =
    isImageFile(
      file.mime_type
    );

  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-card)]">
      {/* Preview */}

      {isImage &&
      file.signed_url ? (
        <button
          type="button"
          onClick={
            onOpenImage
          }
          className="relative block aspect-[4/3] w-full overflow-hidden bg-secondary"
        >
          <img
            src={
              file.signed_url
            }
            alt={
              file.file_name
            }
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900">
              <Eye className="h-4 w-4" />
              Открыть фото
            </span>
          </div>

          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              {getCategoryLabel(
                file.file_category
              )}
            </span>
          </div>
        </button>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-secondary/50 p-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-card text-primary shadow-[var(--shadow-soft)]">
              <DocumentIcon
                mimeType={
                  file.mime_type
                }
              />
            </div>

            <p className="mt-4 text-sm font-bold text-foreground">
              {getFileTypeLabel(
                file.mime_type
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {formatFileSize(
                file.file_size
              )}
            </p>
          </div>
        </div>
      )}

      {/* Content */}

      <div className="p-5">
        <p className="break-words text-sm font-bold leading-6 text-foreground">
          {file.file_name}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            {getCategoryLabel(
              file.file_category
            )}
          </span>

          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {formatFileSize(
              file.file_size
            )}
          </span>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Загружен{" "}
          {formatFileDateTime(
            file.created_at
          )}
        </p>

        {file.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {
              file.description
            }
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {isImage &&
            file.signed_url && (
              <button
                type="button"
                onClick={
                  onOpenImage
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-secondary/50"
              >
                <Eye className="h-4 w-4 text-primary" />
                Просмотр
              </button>
            )}

          {file.signed_url && (
            <a
              href={
                file.signed_url
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-secondary/50"
            >
              <ExternalLink className="h-4 w-4 text-primary" />

              {isImage
                ? "Оригинал"
                : "Открыть"}
            </a>
          )}

          {canDelete && (
            <button
              type="button"
              disabled={
                isDeleting
              }
              onClick={
                onDelete
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:pointer-events-none disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}

              {isDeleting
                ? "Удаляем..."
                : "Удалить"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function DocumentIcon({
  mimeType,
}: {
  mimeType: string;
}) {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return (
      <FileText className="h-8 w-8" />
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
      <FileText className="h-8 w-8" />
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
      <FileSpreadsheet className="h-8 w-8" />
    );
  }

  if (
    mimeType.startsWith(
      "image/"
    )
  ) {
    return (
      <ImageIcon className="h-8 w-8" />
    );
  }

  return (
    <File className="h-8 w-8" />
  );
}