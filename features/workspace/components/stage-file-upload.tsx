"use client";

import {
  useRef,
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

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

  function handleSubmit(
    event:
      React.FormEvent<
        HTMLFormElement
      >
  ) {
    event.preventDefault();

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

      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mt-4 space-y-4 rounded-xl border bg-slate-50 p-4"
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
        <label className="text-sm font-medium">
          Тип материала
        </label>

        <select
          name="fileCategory"
          defaultValue="progress_photo"
          className="mt-2 h-11 w-full rounded-lg border bg-white px-3"
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
      </div>

      <div>
        <label className="text-sm font-medium">
          Файл
        </label>

        <input
          type="file"
          name="file"
          required
          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
          className="mt-2 block w-full rounded-lg border bg-white p-3 text-sm"
        />

        <p className="mt-2 text-xs text-slate-500">
          Максимальный размер — 20 МБ.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">
          Комментарий
        </label>

        <textarea
          name="description"
          rows={2}
          maxLength={1000}
          className="mt-2 w-full rounded-lg border bg-white p-3"
          placeholder="Например, армирование фундамента перед заливкой"
        />
      </div>

      {successMessage && (
        <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {isPending
          ? "Загружаем..."
          : "Загрузить файл"}
      </button>
    </form>
  );
}