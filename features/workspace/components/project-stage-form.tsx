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
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  TriangleAlert,
  Weight,
  X,
} from "lucide-react";

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
  allocatedWeight?: number;
  onClose?: () => void;
};

export function ProjectStageForm({
  projectId,
  stage,
  allocatedWeight = 0,
  onClose,
}: Props) {
  const router =
    useRouter();

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
    watch,
    formState: {
      errors,
      isDirty,
    },
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

      stageId:
        stage?.id,

      title:
        stage?.title ??
        "",

      description:
        stage?.description ??
        "",

      price:
        stage?.price === null ||
        stage?.price ===
          undefined
          ? undefined
          : Number(
              stage.price
            ),

      progressWeight:
        stage?.progress_weight ??
        0,

      plannedStartDate:
        stage
          ?.planned_start_date ??
        "",

      plannedEndDate:
        stage
          ?.planned_end_date ??
        "",
    },
  });

  const watchedProgressWeight =
    Number(
      watch(
        "progressWeight"
      ) ?? 0
    );

  const safeAllocatedWeight =
    Math.max(
      Number(
        allocatedWeight
      ) || 0,
      0
    );

  const availableWeight =
    Math.max(
      100 -
        safeAllocatedWeight,
      0
    );

  const resultingWeight =
    safeAllocatedWeight +
    watchedProgressWeight;

  const exceedsAvailableWeight =
    resultingWeight > 100;

  function onSubmit(
    values:
      ProjectStageInput
  ) {
    console.log(
      "Отправка этапа:",
      values
    );

    if (
      exceedsAvailableWeight
    ) {
      setErrorMessage(
        `Нельзя сохранить этап. Доступно максимум ${availableWeight}%.`
      );

      return;
    }

    setMessage("");
    setErrorMessage("");

    console.log(
      "Вызываем saveProjectStage"
    );

    startTransition(
      async () => {
        const result =
          await saveProjectStage(
            values
          );

        if (
          !result.success
        ) {
          setErrorMessage(
            result.message
          );

          return;
        }

        setMessage(
          result.message
        );

        router.refresh();

        if (onClose) {
          onClose();
        }
      }
    );
  }

  return (
    <form
      onSubmit={handleSubmit(
        onSubmit,
        (
          formErrors
        ) => {
          console.log(
            "Ошибки формы этапа:",
            formErrors
          );

          const firstError =
            Object.values(
              formErrors
            )[0];

          setErrorMessage(
            typeof firstError
              ?.message ===
              "string"
              ? firstError.message
              : "Проверьте заполнение полей формы"
          );
        }
      )}
      className="space-y-6"
    >
      <input
        type="hidden"
        {...register(
          "projectId"
        )}
      />

      {stage && (
        <input
          type="hidden"
          {...register(
            "stageId"
          )}
        />
      )}

      <Field
        label="Название этапа"
        description="Короткое и понятное название этапа."
        icon={
          <FileText className="h-4 w-4" />
        }
        error={
          errors.title
            ?.message
        }
      >
        <input
          className="stroy-input"
          placeholder="Например, устройство фундамента"
          {...register(
            "title"
          )}
        />
      </Field>

      <Field
        label="Описание"
        description="Опишите состав работ и ожидаемый результат."
        icon={
          <FileText className="h-4 w-4" />
        }
        error={
          errors.description
            ?.message
        }
      >
        <textarea
          rows={5}
          className="stroy-textarea"
          placeholder="Например: разработка котлована, устройство подушки, армирование и заливка фундамента..."
          {...register(
            "description"
          )}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Стоимость этапа"
          description="Ориентировочная стоимость работ по этапу."
          icon={
            <Banknote className="h-4 w-4" />
          }
          error={
            errors.price
              ?.message
          }
        >
          <div className="relative">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              className="stroy-input pr-14"
              placeholder="Например, 350000"
              {...register(
                "price",
                {
                  setValueAs:
                    (
                      value
                    ) =>
                      value ===
                      ""
                        ? undefined
                        : Number(
                            value
                          ),
                }
              )}
            />

            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted-foreground">
              ₽
            </span>
          </div>
        </Field>

        <Field
          label="Доля в прогрессе"
          description="Какую долю общего проекта занимает этот этап."
          icon={
            <Weight className="h-4 w-4" />
          }
          error={
            errors
              .progressWeight
              ?.message
          }
        >
          <div className="relative">
            <input
              type="number"
              min="0"
              max={
                availableWeight
              }
              inputMode="numeric"
              className={[
                "stroy-input pr-14",
                exceedsAvailableWeight
                  ? "border-red-400 focus:border-red-500"
                  : "",
              ].join(" ")}
              placeholder="Например, 20"
              {...register(
                "progressWeight",
                {
                  setValueAs:
                    (
                      value
                    ) =>
                      value ===
                      ""
                        ? 0
                        : Number(
                            value
                          ),
                }
              )}
            />

            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted-foreground">
              %
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <WeightInfo
              label="Распределено"
              value={`${safeAllocatedWeight}%`}
            />

            <WeightInfo
              label="Доступно"
              value={`${availableWeight}%`}
            />

            <WeightInfo
              label="После сохранения"
              value={`${resultingWeight}%`}
              danger={
                exceedsAvailableWeight
              }
            />
          </div>

          {exceedsAvailableWeight && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              Слишком большая доля этапа.
              Доступно максимум{" "}
              <strong>
                {
                  availableWeight
                }
                %
              </strong>
              .
            </div>
          )}

          {!exceedsAvailableWeight &&
            watchedProgressWeight >
              0 && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                После сохранения будет
                распределено{" "}
                <strong className="text-foreground">
                  {
                    resultingWeight
                  }
                  %
                </strong>{" "}
                проекта.
              </div>
            )}
        </Field>

        <Field
          label="Плановое начало"
          icon={
            <CalendarDays className="h-4 w-4" />
          }
          error={
            errors
              .plannedStartDate
              ?.message
          }
        >
          <input
            type="date"
            className="stroy-input"
            {...register(
              "plannedStartDate"
            )}
          />
        </Field>

        <Field
          label="Плановое окончание"
          icon={
            <CalendarDays className="h-4 w-4" />
          }
          error={
            errors
              .plannedEndDate
              ?.message
          }
        >
          <input
            type="date"
            className="stroy-input"
            {...register(
              "plannedEndDate"
            )}
          />
        </Field>
      </div>

      {message && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Готово
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {message}
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
                Не удалось сохранить этап
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

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {stage
            ? isDirty
              ? "Есть несохранённые изменения."
              : "Изменения отсутствуют."
            : resultingWeight ===
                100
              ? "После добавления этапа план проекта будет распределён на 100%."
              : `После добавления останется распределить ${Math.max(
                  100 -
                    resultingWeight,
                  0
                )}% проекта.`}
        </p>

        <div className="flex flex-wrap gap-3">
          {onClose && (
            <button
              type="button"
              disabled={
                isPending
              }
              onClick={
                onClose
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary/50 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Отмена
            </button>
          )}

          <button
            type="submit"
            disabled={
              isPending ||
              exceedsAvailableWeight
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(107,70,50,0.16)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Сохраняем...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />

                {stage
                  ? "Сохранить изменения"
                  : "Добавить этап"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  description,
  icon,
  error,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  error?: string;
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

      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function WeightInfo({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-3",
        danger
          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          : "border-border bg-background/60",
      ].join(" ")}
    >
      <p className="text-[11px] text-muted-foreground">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-lg font-bold",
          danger
            ? "text-red-700 dark:text-red-300"
            : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}