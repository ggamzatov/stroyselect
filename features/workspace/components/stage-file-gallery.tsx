"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  CheckCircle2,
  FolderOpen,
  TriangleAlert,
} from "lucide-react";

import { deleteStageFile } from
  "@/features/workspace/actions/delete-stage-file";

import { MaterialSummary } from
  "@/features/workspace/components/material-summary";

import { MaterialTabs } from
  "@/features/workspace/components/material-tabs";

import { StageFileCard } from
  "@/features/workspace/components/stage-file-card";

import { ImageLightbox } from
  "@/features/workspace/components/image-lightbox";

import type {
  MaterialTab,
  StageFile,
} from
  "@/features/workspace/types/stage-file";

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
  const router =
    useRouter();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<MaterialTab>(
      "all"
    );

  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState<
    string | null
  >(null);

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
  ] = useState<
    string | null
  >(null);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const imageFiles =
    useMemo(
      () =>
        files.filter(
          (file) =>
            file.mime_type.startsWith(
              "image/"
            )
        ),
      [files]
    );

  const documentFiles =
    useMemo(
      () =>
        files.filter(
          (file) =>
            !file.mime_type.startsWith(
              "image/"
            )
        ),
      [files]
    );

  const filteredFiles =
    useMemo(() => {
      if (
        activeTab ===
        "photos"
      ) {
        return imageFiles;
      }

      if (
        activeTab ===
        "documents"
      ) {
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
        file.id ===
        selectedImageId
    );

  const selectedImage =
    selectedImageIndex >= 0
      ? imageFiles[
          selectedImageIndex
        ]
      : null;

  const showPreviousImage =
    useCallback(() => {
      if (
        imageFiles.length ===
          0 ||
        selectedImageIndex <
          0
      ) {
        return;
      }

      const previousIndex =
        selectedImageIndex ===
        0
          ? imageFiles.length -
            1
          : selectedImageIndex -
            1;

      setSelectedImageId(
        imageFiles[
          previousIndex
        ].id
      );
    }, [
      imageFiles,
      selectedImageIndex,
    ]);

  const showNextImage =
    useCallback(() => {
      if (
        imageFiles.length ===
          0 ||
        selectedImageIndex <
          0
      ) {
        return;
      }

      const nextIndex =
        selectedImageIndex ===
        imageFiles.length - 1
          ? 0
          : selectedImageIndex +
            1;

      setSelectedImageId(
        imageFiles[
          nextIndex
        ].id
      );
    }, [
      imageFiles,
      selectedImageIndex,
    ]);

  useEffect(() => {
    if (!selectedImage) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setSelectedImageId(
          null
        );
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        showPreviousImage();
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
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
    showNextImage,
    showPreviousImage,
  ]);

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

    setPendingFileId(
      file.id
    );

    startTransition(
      async () => {
        try {
          const result =
            await deleteStageFile(
              file.id,
              projectId
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
            selectedImageId ===
            file.id
          ) {
            setSelectedImageId(
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

  if (
    files.length === 0
  ) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
          <FolderOpen className="h-5 w-5" />
        </div>

        <p className="mt-4 text-sm font-semibold text-foreground">
          Материалы пока
          не загружены
        </p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Загруженные фотографии
          и документы появятся
          здесь.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <MaterialSummary
          totalCount={
            files.length
          }
          photoCount={
            imageFiles.length
          }
          documentCount={
            documentFiles.length
          }
        />

        <MaterialTabs
          activeTab={
            activeTab
          }
          totalCount={
            files.length
          }
          photoCount={
            imageFiles.length
          }
          documentCount={
            documentFiles.length
          }
          onChange={
            setActiveTab
          }
        />

        {successMessage && (
          <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="text-sm font-semibold">
                  Готово
                </p>

                <p className="mt-1 text-sm leading-6 opacity-85">
                  {
                    successMessage
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="text-sm font-semibold">
                  Не удалось удалить файл
                </p>

                <p className="mt-1 text-sm leading-6 opacity-85">
                  {
                    errorMessage
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {filteredFiles.length ===
        0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              В этом разделе
              материалов пока нет.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredFiles.map(
              (file) => (
                <StageFileCard
                  key={
                    file.id
                  }
                  file={
                    file
                  }
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
                    handleDelete(
                      file
                    )
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
            file={
              selectedImage
            }
            currentIndex={
              selectedImageIndex
            }
            totalCount={
              imageFiles.length
            }
            onClose={() =>
              setSelectedImageId(
                null
              )
            }
            onPrevious={
              showPreviousImage
            }
            onNext={
              showNextImage
            }
          />
        )}
    </>
  );
}
