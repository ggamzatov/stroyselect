"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  ImagePlus,
  Loader2,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";

import { uploadPortfolioFiles } from
  "@/features/contractors/portfolio/actions/upload-portfolio-files";

type Props = {
  portfolioProjectId: string;
};

type PreviewItem = {
  id: string;
  file: File;
  url: string;
};

export function PortfolioFileUpload({
  portfolioProjectId,
}: Props) {
  const router =
    useRouter();

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<File[]>(
      []
    );

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

  const previews =
    useMemo<
      PreviewItem[]
    >(
      () =>
        selectedFiles.map(
          (file) => ({
            id:
              `${file.name}-${file.size}-${file.lastModified}`,

            file,

            url:
              URL.createObjectURL(
                file
              ),
          })
        ),
      [selectedFiles]
    );

  useEffect(() => {
    return () => {
      previews.forEach(
        (preview) => {
          URL.revokeObjectURL(
            preview.url
          );
        }
      );
    };
  }, [previews]);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFilesChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const files =
      Array.from(
        event.target.files ??
          []
      );

    setErrorMessage("");
    setSuccessMessage("");

    if (
      files.length === 0
    ) {
      return;
    }

    const validFiles:
      File[] = [];

    for (
      const file of files
    ) {
      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          file.type
        )
      ) {
        setErrorMessage(
          "Поддерживаются только JPG, PNG и WEBP."
        );

        continue;
      }

      if (
        file.size >
        20 *
          1024 *
          1024
      ) {
        setErrorMessage(
          `Файл «${file.name}» превышает 20 МБ.`
        );

        continue;
      }

      validFiles.push(
        file
      );
    }

    setSelectedFiles(
      (
        current
      ) => {
        const combined =
          [
            ...current,
            ...validFiles,
          ];

        const unique =
          combined.filter(
            (
              file,
              index,
              array
            ) =>
              array.findIndex(
                (
                  item
                ) =>
                  item.name ===
                    file.name &&
                  item.size ===
                    file.size &&
                  item.lastModified ===
                    file.lastModified
              ) === index
          );

        return unique.slice(
          0,
          10
        );
      }
    );

    event.target.value =
      "";
  }

  function removeFile(
    index: number
  ) {
    setSelectedFiles(
      (current) =>
        current.filter(
          (
            _,
            currentIndex
          ) =>
            currentIndex !==
            index
        )
    );
  }

  function clearFiles() {
    setSelectedFiles(
      []
    );

    setErrorMessage("");
  }

  function uploadFiles() {
    if (
      selectedFiles.length ===
      0
    ) {
      setErrorMessage(
        "Выберите фотографии"
      );

      return;
    }

    const formData =
      new FormData();

    formData.set(
      "portfolioProjectId",
      portfolioProjectId
    );

    selectedFiles.forEach(
      (file) => {
        formData.append(
          "files",
          file
        );
      }
    );

    setErrorMessage("");
    setSuccessMessage("");

    startTransition(
      async () => {
        const result =
          await uploadPortfolioFiles(
            formData
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

        setSelectedFiles(
          []
        );

        router.refresh();
      }
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={
          handleFilesChange
        }
      />

      <button
        type="button"
        disabled={
          isPending
        }
        onClick={
          openPicker
        }
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-primary/25 hover:bg-secondary disabled:opacity-50"
      >
        <ImagePlus className="h-4 w-4 text-primary" />

        Добавить фотографии
      </button>

      {selectedFiles.length >
        0 && (
        <div className="rounded-[1.5rem] border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Выбрано фотографий:{" "}
                {
                  selectedFiles.length
                }
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Максимум 10 за одну загрузку.
              </p>
            </div>

            <button
              type="button"
              disabled={
                isPending
              }
              onClick={
                clearFiles
              }
              className="text-xs font-semibold text-muted-foreground transition hover:text-red-600"
            >
              Очистить
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {previews.map(
              (
                preview,
                index
              ) => (
                <div
                  key={
                    preview.id
                  }
                  className="relative aspect-square overflow-hidden rounded-[1rem] border border-border bg-secondary"
                >
                  <img
                    src={
                      preview.url
                    }
                    alt={
                      preview.file
                        .name
                    }
                    className="h-full w-full object-cover"
                  />

                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      removeFile(
                        index
                      )
                    }
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80"
                    aria-label="Убрать фотографию"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8">
                    <p className="truncate text-[10px] text-white">
                      {
                        preview.file
                          .name
                      }
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                isPending
              }
              onClick={
                uploadFiles
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#5c3b2a] disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загружаем...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Загрузить
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />

            <p className="text-sm">
              {errorMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}