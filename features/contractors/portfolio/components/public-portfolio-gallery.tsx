"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Expand,
  ImageIcon,
  X,
} from "lucide-react";

type PortfolioFile = {
  id: string;
  file_name: string;
  file_size: number | string;
  sort_order: number;
  signed_url: string | null;
};

type Props = {
  files: PortfolioFile[];
};

export function PublicPortfolioGallery({
  files,
}: Props) {
  const [
    openedFile,
    setOpenedFile,
  ] =
    useState<
      PortfolioFile | null
    >(null);

  const sortedFiles =
    [...files].sort(
      (
        first,
        second
      ) =>
        Number(
          first.sort_order ??
            0
        ) -
        Number(
          second.sort_order ??
            0
        )
    );

  if (
    sortedFiles.length ===
    0
  ) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-[1.25rem] border border-dashed border-border bg-secondary/30">
        <div className="text-center">
          <ImageIcon className="mx-auto h-7 w-7 text-primary" />

          <p className="mt-2 text-xs text-muted-foreground">
            Фотографий нет
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sortedFiles.map(
          (
            file
          ) => (
            <button
              key={
                file.id
              }
              type="button"
              disabled={
                !file.signed_url
              }
              onClick={() =>
                setOpenedFile(
                  file
                )
              }
              className="group relative aspect-square overflow-hidden rounded-[1.1rem] border border-border bg-secondary"
            >
              {file.signed_url ? (
                <>
                  <img
                    src={
                      file.signed_url
                    }
                    alt={
                      file.file_name
                    }
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                  />

                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow">
                      <Expand className="h-4 w-4" />
                    </span>
                  </div>
                </>
              ) : (
                <ImageIcon className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" />
              )}
            </button>
          )
        )}
      </div>

      {openedFile &&
        openedFile.signed_url && (
          <PublicLightbox
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

function PublicLightbox({
  file,
  onClose,
}: {
  file:
    PortfolioFile;

  onClose:
    () => void;
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

    const oldOverflow =
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
        oldOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={
        onClose
      }
    >
      <button
        type="button"
        onClick={
          onClose
        }
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="max-w-6xl"
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <img
  src={file.signed_url ?? undefined}
  alt={file.file_name}
  className="max-h-[85vh] max-w-full rounded-[1.25rem] object-contain shadow-2xl"
/>

        <div className="mt-4 text-center text-white">
          <p className="font-semibold">
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