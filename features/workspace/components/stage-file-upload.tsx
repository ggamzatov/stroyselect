"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";

import { uploadStageFile } from
  "@/features/workspace/actions/upload-stage-file";

type Props = {
  projectId: string;
  stageId: string;
};

export function StageFileUpload({
  projectId,
  stageId,
}: Props) {
  const router = useRouter();

  const formRef =
    useRef<HTMLFormElement>(
      null
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState<string | null>(
    null
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const isSelectedImage =
    selectedFile?.type.startsWith(
      "image/"
    ) ?? false;

  useEffect(() => {
    if (
      !selectedFile ||
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl =
      URL.createObjectURL(
        selectedFile
      );

    setPreviewUrl(
      objectUrl
    );

    return () => {
      URL.revokeObjectURL(
        objectUrl
      );
    };
  }, [selectedFile]);

  function handleFileChange(
    event:
      React.ChangeEvent<
        HTMLInputElement
      >
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    setErrorMessage("");
    setSuccessMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const maxSize =
      20 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      event.target.value =
        "";

      setSelectedFile(
        null
      );

      setErrorMessage(
        "Размер файла превышает 20 МБ."
      );

      return;
    }

    setSelectedFile(
      file
    );
  }

  function clearSelectedFile() {
    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }

    setSelectedFile(
      null
    );

    setSuccessMessage("");
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleSubmit(
    event:
      React.FormEvent<
        HTMLFormElement
      >
  ) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage(
        "Выберите файл для загрузки."
      );

      return;
    }

    const formData =
      new FormData(
        event.currentTarget
      );

    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const result =
        await uploadStageFile(
          formData
        );

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setSuccessMessage(
        result.message
      );

      formRef.current?.reset();

      setSelectedFile(
        null
      );

      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
    >
      <input
        type="hidden"
        name="projectId"
        value={projectId}
      />

      <input
        type="hidden"
        name="stageId"
        value={stageId}
      />

      <div>
        <p className="text-sm font-semibold text-primary">
          Добавить материал
        </p>

        <h4 className="mt-1 text-lg font-bold text-foreground">
          Файл по этапу
        </h4>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Загрузите фотографию,
          документ, акт, счёт или
          другой материал по этому
          этапу.
        </p>
      </div>

      <Field
        label="Тип материала"
        description="Выберите, к какой категории относится файл."
        icon={
          <Paperclip className="h-4 w-4" />
        }
      >
        <div className="relative">
          <select
            name="fileCategory"
            defaultValue="progress_photo"
            className="stroy-select appearance-none pr-12"
          >
            <option value="before_photo">
              Фото до начала
            </option>

            <option value="progress_photo">
              Фото процесса
            </option>

            <option value="after_photo">
              Фото результата
            </option>

            <option value="document">
              Документ или акт
            </option>

            <option value="invoice">
              Чек или счёт
            </option>

            <option value="other">
              Другое
            </option>
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
            ▼
          </div>
        </div>
      </Field>

      <Field
        label="Файл"
        description="JPG, PNG, WEBP, PDF, DOC, DOCX, XLS или XLSX. Максимум 20 МБ."
        icon={
          <ImageIcon className="h-4 w-4" />
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          required
          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
          className="sr-only"
          onChange={
            handleFileChange
          }
        />

        {!selectedFile ? (
          <button
            type="button"
            onClick={
              openFilePicker
            }
            className="group flex w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-background/60 px-6 py-8 text-center transition hover:border-primary/30 hover:bg-secondary/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Upload className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm font-semibold text-foreground">
              Выберите файл
            </p>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Нажмите, чтобы выбрать
              фотографию или документ.
            </p>
          </button>
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-background/60">
            {isSelectedImage &&
            previewUrl ? (
              <div className="relative bg-secondary/40">
                <img
                  src={
                    previewUrl
                  }
                  alt="Предпросмотр выбранного файла"
                  className="max-h-[360px] w-full object-contain"
                />

                <div className="absolute right-3 top-3 flex gap-2">
                  <button
                    type="button"
                    onClick={
                      openFilePicker
                    }
                    disabled={
                      isPending
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-50"
                    aria-label="Заменить фотографию"
                    title="Заменить"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearSelectedFile
                    }
                    disabled={
                      isPending
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-50"
                    aria-label="Удалить выбранную фотографию"
                    title="Убрать"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <FileText className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {
                      selectedFile.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatFileSize(
                      selectedFile.size
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    clearSelectedFile
                  }
                  disabled={
                    isPending
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  aria-label="Удалить выбранный файл"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {
                    selectedFile.name
                  }
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatFileSize(
                    selectedFile.size
                  )}
                  {" · "}
                  {getSelectedFileTypeLabel(
                    selectedFile
                  )}
                </p>
              </div>

              {!isSelectedImage && (
                <button
                  type="button"
                  onClick={
                    openFilePicker
                  }
                  disabled={
                    isPending
                  }
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-secondary/50 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Заменить
                </button>
              )}
            </div>
          </div>
        )}
      </Field>

      <Field
        label="Комментарий"
        description="Необязательно. Кратко поясните, что находится в файле."
        icon={
          <MessageSquareText className="h-4 w-4" />
        }
      >
        <textarea
          name="description"
          rows={3}
          maxLength={1000}
          className="stroy-textarea"
          placeholder="Например, армирование фундамента перед заливкой"
        />
      </Field>

      {successMessage && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Файл загружен
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {successMessage}
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
                Не удалось загрузить файл
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border pt-5">
        <button
          type="submit"
          disabled={
            isPending ||
            !selectedFile
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(107,70,50,0.16)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Загружаем...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Загрузить файл
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  description,
  icon,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-primary">
              {icon}
            </span>
          )}

          <p className="text-sm font-semibold text-foreground">
            {label}
          </p>
        </div>

        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}

function formatFileSize(
  bytes: number
) {
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

function getSelectedFileTypeLabel(
  file: File
) {
  if (
    file.type.startsWith(
      "image/"
    )
  ) {
    return "Фотография";
  }

  if (
    file.type ===
    "application/pdf"
  ) {
    return "PDF";
  }

  if (
    file.name
      .toLowerCase()
      .endsWith(".doc") ||
    file.name
      .toLowerCase()
      .endsWith(".docx")
  ) {
    return "Word";
  }

  if (
    file.name
      .toLowerCase()
      .endsWith(".xls") ||
    file.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return "Excel";
  }

  return "Документ";
}