"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  Crown,
  Expand,
  ImageIcon,
  Loader2,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { deletePortfolioFile } from
  "@/features/contractors/portfolio/actions/delete-portfolio-file";

import { setPortfolioCover } from
  "@/features/contractors/portfolio/actions/set-portfolio-cover";

export type PortfolioGalleryFile = {
  id: string;
  portfolio_project_id: string;
  uploaded_by: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  file_size: number | string;
  mime_type: string;
  sort_order: number;
  created_at: string;
  signed_url: string | null;
};

type Props = {
  files:
    PortfolioGalleryFile[];
};

export function PortfolioGallery({
  files,
}: Props) {
  const router =
    useRouter();

  const [
    openedFile,
    setOpenedFile,
  ] =
    useState<
      PortfolioGalleryFile | null
    >(null);

  const [
    pendingFileId,
    setPendingFileId,
  ] =
    useState<
      string | null
    >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const sortedFiles =
    [...files].sort(
      (
        first,
        second
      ) =>
        Number(
          first.sort_order ?? 0
        ) -
        Number(
          second.sort_order ?? 0
        )
    );

  const coverId =
    sortedFiles[0]?.id ??
    null;

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleDelete(
    file:
      PortfolioGalleryFile
  ) {
    const confirmed =
      window.confirm(
        `Удалить фотографию «${file.file_name}»?`
      );

    if (!confirmed) {
      return;
    }

    clearMessages();

    setPendingFileId(
      file.id
    );

    startTransition(
      async () => {
        try {
          const result =
            await deletePortfolioFile(
              file.id
            );

          if (
            !result.success
          ) {
            setErrorMessage(
              result.message
            );

            return;
          }

          if (
            openedFile?.id ===
            file.id
          ) {
            setOpenedFile(
              null
            );
          }

          setSuccessMessage(
            result.message
          );

          router.refresh();
        } finally {
          setPendingFileId(
            null
          );
        }
      }
    );
  }

  function handleCover(
    file:
      PortfolioGalleryFile
  ) {
    if (
      file.id ===
      coverId
    ) {
      return;
    }

    clearMessages();

    setPendingFileId(
      file.id
    );

    startTransition(
      async () => {
        try {
          const result =
            await setPortfolioCover(
              file.id
            );

          if (
            !result.success
          ) {
            setErrorMessage(
              result.message
            );

            return;
          }

          setSuccessMessage(
            result.message
          );

          router.refresh();
        } finally {
          setPendingFileId(
            null
          );
        }
      }
    );
  }

  if (
    files.length === 0
  ) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-border bg-background/50 p-6 text-center">
        <ImageIcon className="mx-auto h-6 w-6 text-primary" />

        <p className="mt-3 text-sm font-semibold text-foreground">
          Фотографий пока нет
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          Добавьте фотографии выполненного объекта.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />

              <span>
                {errorMessage}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sortedFiles.map(
            (
              file,
              index
            ) => {
              const isCover =
                file.id ===
                coverId;

              const isCurrentPending =
                isPending &&
                pendingFileId ===
                  file.id;

              return (
                <article
                  key={
                    file.id
                  }
                  className={[
                    "group relative aspect-square overflow-hidden rounded-[1.1rem] border bg-secondary",
                    isCover
                      ? "border-primary/50 ring-2 ring-primary/10"
                      : "border-border",
                  ].join(" ")}
                >
                  {file.signed_url ? (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenedFile(
                          file
                        )
                      }
                      className="h-full w-full"
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
                    </button>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}

                  {isCover && (
                    <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-sm">
                      <Crown className="h-3 w-3" />
                      Обложка
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 pt-10 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={
                        isPending ||
                        !file.signed_url
                      }
                      onClick={() =>
                        setOpenedFile(
                          file
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-900 transition hover:bg-white disabled:opacity-50"
                      title="Открыть"
                    >
                      <Expand className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex gap-1.5">
                      {!isCover && (
                        <button
                          type="button"
                          disabled={
                            isPending
                          }
                          onClick={() =>
                            handleCover(
                              file
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-amber-700 transition hover:bg-white disabled:opacity-50"
                          title="Сделать обложкой"
                        >
                          {isCurrentPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Crown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={
                          isPending
                        }
                        onClick={() =>
                          handleDelete(
                            file
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 transition hover:bg-white disabled:opacity-50"
                        title="Удалить"
                      >
                        {isCurrentPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                    {index + 1}
                  </span>
                </article>
              );
            }
          )}
        </div>
      </div>

      {openedFile &&
        openedFile.signed_url && (
          <PortfolioLightbox
            file={
              openedFile
            }
            onClose={() =>
              setOpenedFile(
                null
              )
            }
          />
        )}
    </>
  );
}

function PortfolioLightbox({
  file,
  onClose,
}: {
  file:
    PortfolioGalleryFile;

  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
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
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="flex max-h-full max-w-6xl flex-col items-center"
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <img
          src={
            file.signed_url ??
            ""
          }
          alt={
            file.file_name
          }
          className="max-h-[82vh] max-w-full rounded-[1.25rem] object-contain shadow-2xl"
        />

        <div className="mt-4 rounded-xl bg-black/40 px-4 py-3 text-center text-white backdrop-blur">
          <p className="max-w-xl break-words text-sm font-semibold">
            {
              file.file_name
            }
          </p>

          <p className="mt-1 text-xs text-white/60">
            {formatFileSize(
              file.file_size
            )}
          </p>
        </div>
      </div>
    </div>
  );
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
    )
  ) {
    return "Размер неизвестен";
  }

  if (
    bytes <
    1024
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