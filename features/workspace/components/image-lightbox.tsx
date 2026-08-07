import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";

import type {
  StageFile,
} from
  "@/features/workspace/types/stage-file";

type Props = {
  file: StageFile;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function ImageLightbox({
  file,
  currentIndex,
  totalCount,
  onClose,
  onPrevious,
  onNext,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фотографии"
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

      {totalCount > 1 && (
        <>
          <button
            type="button"
            onClick={(
              event
            ) => {
              event.stopPropagation();
              onPrevious();
            }}
            className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:left-6"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={(
              event
            ) => {
              event.stopPropagation();
              onNext();
            }}
            className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:right-6"
            aria-label="Следующее фото"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      <div
        className="flex max-h-full w-full max-w-6xl flex-col items-center"
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <div className="flex max-h-[75vh] w-full items-center justify-center">
          <img
            src={
              file.signed_url ??
              ""
            }
            alt={
              file.file_name
            }
            className="max-h-[75vh] max-w-full rounded-[1.25rem] object-contain shadow-2xl"
          />
        </div>

        <div className="mt-5 w-full max-w-3xl rounded-[1.5rem] bg-black/40 p-4 text-center text-white backdrop-blur">
          <p className="font-semibold">
            {file.file_name}
          </p>

          <p className="mt-1 text-xs text-white/60">
            {currentIndex + 1}{" "}
            из {totalCount}
          </p>

          {file.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">
              {
                file.description
              }
            </p>
          )}

          {file.signed_url && (
            <a
              href={
                file.signed_url
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