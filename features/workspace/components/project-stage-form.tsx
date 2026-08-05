"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import { useForm } from
  "react-hook-form";

import { zodResolver } from
  "@hookform/resolvers/zod";

import {
  projectStageSchema,
  type ProjectStageInput,
  type ProjectStageFormInput,
} from
  "@/features/workspace/schemas/project-stage-schema";

import { saveProjectStage } from
  "@/features/workspace/actions/save-project-stage";

type ExistingStage = {
  id: string;
  title: string;
  description: string | null;
  price: number | string | null;
  progress_weight: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
};

type Props = {
  projectId: string;
  stage?: ExistingStage | null;
  onClose?: () => void;
};

export function ProjectStageForm({
  projectId,
  stage,
  onClose,
}: Props) {
  const router = useRouter();

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    ProjectStageFormInput,
    unknown,
    ProjectStageInput
  >({
    resolver:
      zodResolver(
        projectStageSchema
      ),

    defaultValues: {
      projectId,
      stageId: stage?.id,

      title:
        stage?.title ?? "",

      description:
        stage?.description ?? "",

      price:
        stage?.price === null ||
        stage?.price === undefined
          ? undefined
          : Number(stage.price),

      progressWeight:
        stage?.progress_weight ?? 0,

      plannedStartDate:
        stage?.planned_start_date ??
        "",

      plannedEndDate:
        stage?.planned_end_date ??
        "",
    },
  });

  function onSubmit(
    values: ProjectStageInput
  ) {
    console.log(
  "Отправка этапа:",
  values
);
    setMessage("");
    setErrorMessage("");
console.log(
  "Вызываем saveProjectStage"
);
    startTransition(async () => {
      const result =
        await saveProjectStage(
          values
        );

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setMessage(result.message);

      router.refresh();

      if (onClose) {
        onClose();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(
  onSubmit,
  (formErrors) => {
    console.log(
      "Ошибки формы этапа:",
      formErrors
    );

   const firstError =
  Object.values(formErrors)[0];

setErrorMessage(
  typeof firstError?.message === "string"
    ? firstError.message
    : "Проверьте заполнение полей формы"
);
  }
)}
      className="space-y-5"
    >
      <input
        type="hidden"
        {...register("projectId")}
      />

      {stage && (
  <input
    type="hidden"
    {...register("stageId")}
  />
)}

      <Field label="Название этапа">
        <input
          className="h-11 w-full rounded-lg border px-3"
          placeholder="Например, устройство фундамента"
          {...register("title")}
        />

        <ErrorText
          message={
            errors.title?.message
          }
        />
      </Field>

      <Field label="Описание">
        <textarea
          rows={4}
          className="w-full rounded-lg border p-3"
          placeholder="Опишите состав и ожидаемый результат этапа"
          {...register(
            "description"
          )}
        />

        <ErrorText
          message={
            errors.description
              ?.message
          }
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Стоимость этапа, ₽">
          <input
            type="number"
            min="0"
            className="h-11 w-full rounded-lg border px-3"
            {...register("price", {
            setValueAs: (value) =>
            value === "" ? undefined : Number(value),
            })}
          />

          <ErrorText
            message={
              errors.price?.message
            }
          />
        </Field>

        <Field label="Доля в прогрессе, %">
          <input
            type="number"
            min="0"
            max="100"
            className="h-11 w-full rounded-lg border px-3"
             {...register("progressWeight", {
             setValueAs: (value) =>
            value === ""
             ? 0
            : Number(value),
            })}
          />

          <ErrorText
            message={
              errors.progressWeight
                ?.message
            }
          />
        </Field>

        <Field label="Плановое начало">
          <input
            type="date"
            className="h-11 w-full rounded-lg border px-3"
            {...register(
              "plannedStartDate"
            )}
          />
        </Field>

        <Field label="Плановое окончание">
          <input
            type="date"
            className="h-11 w-full rounded-lg border px-3"
            {...register(
              "plannedEndDate"
            )}
          />

          <ErrorText
            message={
              errors.plannedEndDate
                ?.message
            }
          />
        </Field>
      </div>

      {message && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {isPending
            ? "Сохраняем..."
            : stage
              ? "Сохранить изменения"
              : "Добавить этап"}
        </button>

        {onClose && (
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="rounded-xl border px-5 py-3 font-semibold"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {label}
      </span>

      {children}
    </label>
  );
}

function ErrorText({
  message,
}: {
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-red-600">
      {message}
    </p>
  );
}