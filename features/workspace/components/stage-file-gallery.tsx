"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

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

type MaterialTab =
  | "all"
  | "photos"
  | "documents";

export function StageFileGallery({
  projectId,
  files,
  currentUserId,
  allowDelete = false,
}: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] =
    useState<MaterialTab>("all");

  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState<string | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    pendingFileId,
    setPendingFileId,
  ] = useState<string | null>(null);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const imageFiles = useMemo(
    () =>
      files.filter((file) =>
        file.mime_type.startsWith("image/")
      ),
    [files]
  );

  const documentFiles = useMemo(
    () =>
      files.filter(
        (file) =>
          !file.mime_type.startsWith("image/")
      ),
    [files]
  );

  const filteredFiles = useMemo(() => {
    if (activeTab === "photos") {
      return imageFiles;
    }

    if (activeTab === "documents") {
      return documentFiles;
    }

    return files;
  }, [
    activeTab,
    files,
    imageFiles,
    documentFiles,
  ]);

  const selectedImageIndex =
    imageFiles.findIndex(
      (file) =>
        file.id === selectedImageId
    );

  const selectedImage =
    selectedImageIndex >= 0
      ? imageFiles[selectedImageIndex]
      : null;

  useEffect(() => {
    if (!selectedImage) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setSelectedImageId(null);
      }

      if (event.key === "ArrowLeft") {
        showPreviousImage();
      }

      if (event.key === "ArrowRight") {
        showNextImage();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        "";
    };
  }, [
    selectedImage,
    selectedImageIndex,
    imageFiles,
  ]);

  function showPreviousImage() {
    if (
      imageFiles.length === 0 ||
      selectedImageIndex < 0
    ) {
      return;
    }

    const previousIndex =
      selectedImageIndex === 0
        ? imageFiles.length - 1
        : selectedImageIndex - 1;

    setSelectedImageId(
      imageFiles[previousIndex].id
    );
  }

  function showNextImage() {
    if (
      imageFiles.length === 0 ||
      selectedImageIndex < 0
    ) {
      return;
    }

    const nextIndex =
      selectedImageIndex ===
      imageFiles.length - 1
        ? 0
        : selectedImageIndex + 1;

    setSelectedImageId(
      imageFiles[nextIndex].id
    );
  }

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
    setSuccessMessage("");
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

        if (
          selectedImageId === file.id
        ) {
          setSelectedImageId(null);
        }

        setSuccessMessage(
          result.message
        );

        router.refresh();
      } finally {
        setPendingFileId(null);
      }
    });
  }

  if (files.length === 0) {
    return (
      <div className="mt-4 rounded-xl bg-slate-50 p-5">
        <p className="text-sm text-slate-500">
          Материалы пока не загружены.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4">
        <MaterialSummary
          totalCount={files.length}
          photoCount={imageFiles.length}
          documentCount={
            documentFiles.length
          }
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <TabButton
            active={activeTab === "all"}
            onClick={() =>
              setActiveTab("all")
            }
          >
            Все ({files.length})
          </TabButton>

          <TabButton
            active={
              activeTab === "photos"
            }
            onClick={() =>
              setActiveTab("photos")
            }
          >
            Фото ({imageFiles.length})
          </TabButton>

          <TabButton
            active={
              activeTab === "documents"
            }
            onClick={() =>
              setActiveTab("documents")
            }
          >
            Документы (
            {documentFiles.length})
          </TabButton>
        </div>

        {successMessage && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {filteredFiles.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              В этом разделе материалов
              пока нет.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map(
              (file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  canDelete={
                    allowDelete &&
                    file.uploaded_by ===
                      currentUserId
                  }
                  isDeleting={
                    isPending &&
                    pendingFileId ===
                      file.id
                  }
                  onOpenImage={() =>
                    setSelectedImageId(
                      file.id
                    )
                  }
                  onDelete={() =>
                    handleDelete(file)
                  }
                />
              )
            )}
          </div>
        )}
      </div>

      {selectedImage &&
        selectedImage.signed_url && (
          <ImageLightbox
            file={selectedImage}
            currentIndex={
              selectedImageIndex
            }
            totalCount={
              imageFiles.length
            }
            onClose={() =>
              setSelectedImageId(null)
            }
            onPrevious={
              showPreviousImage
            }
            onNext={showNextImage}
          />
        )}
    </>
  );
}

function MaterialSummary({
  totalCount,
  photoCount,
  documentCount,
}: {
  totalCount: number;
  photoCount: number;
  documentCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryItem
        label="Всего материалов"
        value={totalCount}
      />

      <SummaryItem
        label="Фотографии"
        value={photoCount}
      />

      <SummaryItem
        label="Документы"
        value={documentCount}
      />
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          : "rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      }
    >
      {children}
    </button>
  );
}

function FileCard({
  file,
  canDelete,
  isDeleting,
  onOpenImage,
  onDelete,
}: {
  file: StageFile;
  canDelete: boolean;
  isDeleting: boolean;
  onOpenImage: () => void;
  onDelete: () => void;
}) {
  const isImage =
    file.mime_type.startsWith("image/");

  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {isImage && file.signed_url ? (
        <button
          type="button"
          onClick={onOpenImage}
          className="group relative block w-full overflow-hidden bg-slate-100"
        >
          <img
            src={file.signed_url}
            alt={file.file_name}
            className="h-48 w-full object-cover transition duration-200 group-hover:scale-105"
          />

          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-semibold text-transparent transition group-hover:bg-black/35 group-hover:text-white">
            Открыть фото
          </span>
        </button>
      ) : (
        <div className="flex h-48 items-center justify-center bg-slate-100 px-5 text-center">
          <div>
            <div className="text-4xl">
              {getFileIcon(
                file.mime_type
              )}
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700">
              {getFileTypeLabel(
                file.mime_type
              )}
            </p>
          </div>
        </div>
      )}

      <div className="p-4">
        <p className="break-words font-semibold">
          {file.file_name}
        </p>

        <p className="mt-2 text-xs text-slate-500">
          {getCategoryLabel(
            file.file_category
          )}
          {" · "}
          {formatFileSize(
            file.file_size
          )}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Загружен:{" "}
          {formatDateTime(
            file.created_at
          )}
        </p>

        {file.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {file.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {file.signed_url && (
            <a
              href={file.signed_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isImage
                ? "Открыть"
                : "Открыть документ"}
            </a>
          )}

          {canDelete && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={onDelete}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
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

function ImageLightbox({
  file,
  currentIndex,
  totalCount,
  onClose,
  onPrevious,
  onNext,
}: {
  file: StageFile;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фотографии"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/15 px-4 py-2 text-xl font-bold text-white hover:bg-white/25"
        aria-label="Закрыть"
      >
        ×
      </button>

      {totalCount > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl font-bold text-white hover:bg-white/25"
            aria-label="Предыдущее фото"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl font-bold text-white hover:bg-white/25"
            aria-label="Следующее фото"
          >
            ›
          </button>
        </>
      )}

      <div
        className="flex max-h-full max-w-6xl flex-col items-center"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <img
          src={file.signed_url ?? ""}
          alt={file.file_name}
          className="max-h-[75vh] max-w-full rounded-lg object-contain"
        />

        <div className="mt-4 max-w-3xl text-center text-white">
          <p className="font-semibold">
            {file.file_name}
          </p>

          <p className="mt-1 text-sm text-white/70">
            {currentIndex + 1} из{" "}
            {totalCount}
          </p>

          {file.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
              {file.description}
            </p>
          )}

          {file.signed_url && (
            <a
              href={file.signed_url}
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

    document:
      "Документ или акт",

    invoice:
      "Чек или счёт",

    other:
      "Другое",
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

  return "Документ";
}

function getFileIcon(
  mimeType: string
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

  return "📎";
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

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}