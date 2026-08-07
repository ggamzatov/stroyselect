"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  CheckCircle2,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";

import { ProjectStageForm } from
  "@/features/workspace/components/project-stage-form";

import { ContractorStageCard } from
  "@/features/workspace/components/contractor-stage-card";

import { deleteProjectStage } from
  "@/features/workspace/actions/delete-project-stage";

import { updateProjectStageStatus } from
  "@/features/workspace/actions/update-project-stage-status";

import type { WorkspaceStage } from
  "@/features/workspace/types/stage";

type Props = {
  projectId: string;
  stages: WorkspaceStage[];
};

type FormMode =
  | "closed"
  | "create"
  | "edit";

export function ContractorStageManager({
  projectId,
  stages,
}: Props) {
  const router =
    useRouter();

  const [
    formMode,
    setFormMode,
  ] =
    useState<FormMode>(
      "closed"
    );

  const [
    editingStageId,
    setEditingStageId,
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
    pendingStageId,
    setPendingStageId,
  ] =
    useState<
      string | null
    >(null);

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  /*
   * Находим этап,
   * который сейчас редактируем.
   */
  const editingStage =
    stages.find(
      (stage) =>
        stage.id ===
        editingStageId
    ) ?? null;

  /*
   * Считаем общую долю
   * всех этапов проекта.
   *
   * Например:
   * 35 + 25 + 20 = 80%.
   */
  const totalAllocatedWeight =
    stages.reduce(
      (sum, stage) =>
        sum +
        Number(
          stage.progress_weight ??
            0
        ),
      0
    );

  /*
   * Сколько ещё процентов
   * можно распределить.
   */
  const availableWeight =
    Math.max(
      100 -
        totalAllocatedWeight,
      0
    );

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openCreateForm() {
    clearMessages();

    setEditingStageId(
      null
    );

    setFormMode(
      "create"
    );
  }

  function openEditForm(
    stageId: string
  ) {
    clearMessages();

    setEditingStageId(
      stageId
    );

    setFormMode(
      "edit"
    );
  }

  function closeForm() {
    setEditingStageId(
      null
    );

    setFormMode(
      "closed"
    );
  }

  function handleDelete(
    stage: WorkspaceStage
  ) {
    const confirmed =
      window.confirm(
        `Удалить этап «${stage.title}»?`
      );

    if (!confirmed) {
      return;
    }

    clearMessages();

    setPendingStageId(
      stage.id
    );

    startTransition(
      async () => {
        try {
          const result =
            await deleteProjectStage(
              stage.id,
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

          /*
           * Если удалили этап,
           * который редактировался,
           * закрываем форму.
           */
          if (
            editingStageId ===
            stage.id
          ) {
            closeForm();
          }

          setSuccessMessage(
            result.message
          );

          router.refresh();
        } finally {
          setPendingStageId(
            null
          );
        }
      }
    );
  }

  function handleStageAction(
    stage: WorkspaceStage,
    action:
      | "start"
      | "submit"
      | "resume"
  ) {
    const actionLabel =
      action === "start"
        ? "Начать"
        : action ===
            "submit"
          ? "Отправить на проверку"
          : "Начать исправление";

    const confirmed =
      window.confirm(
        `${actionLabel} этап «${stage.title}»?`
      );

    if (!confirmed) {
      return;
    }

    clearMessages();

    setPendingStageId(
      stage.id
    );

    startTransition(
      async () => {
        try {
          const result =
            await updateProjectStageStatus(
              stage.id,
              projectId,
              action
            );

          if (
            !result.success
          ) {
            setErrorMessage(
              result.message
            );

            return;
          }

          /*
           * Если этап был открыт
           * на редактирование,
           * после смены статуса
           * закрываем форму.
           */
          if (
            editingStageId ===
            stage.id
          ) {
            closeForm();
          }

          setSuccessMessage(
            result.message
          );

          router.refresh();
        } finally {
          setPendingStageId(
            null
          );
        }
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Верхняя панель */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            План работ
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Всего этапов:{" "}
            {stages.length}
          </p>
        </div>

        {formMode ===
        "closed" ? (
          <button
            type="button"
            disabled={
              isPending
            }
            onClick={
              openCreateForm
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(107,70,50,0.16)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />

            Добавить этап
          </button>
        ) : (
          <button
            type="button"
            disabled={
              isPending
            }
            onClick={
              closeForm
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary/50 disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="h-4 w-4" />

            Закрыть форму
          </button>
        )}
      </div>

      {/* Информация о распределении проекта */}

      <div className="grid gap-3 sm:grid-cols-3">
        <WeightSummary
          label="Распределено"
          value={`${totalAllocatedWeight}%`}
        />

        <WeightSummary
          label="Доступно"
          value={`${availableWeight}%`}
        />

        <WeightSummary
          label="Статус плана"
          value={
            totalAllocatedWeight ===
            100
              ? "Готов"
              : totalAllocatedWeight >
                  100
                ? "Ошибка"
                : "Не завершён"
          }
          success={
            totalAllocatedWeight ===
            100
          }
          danger={
            totalAllocatedWeight >
            100
          }
        />
      </div>

      {/* План распределён полностью */}

      {totalAllocatedWeight ===
        100 && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                План проекта
                распределён полностью
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                Между этапами
                распределено 100%
                объёма проекта.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* План ещё не сформирован полностью */}

      {totalAllocatedWeight >
        0 &&
        totalAllocatedWeight <
          100 && (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="text-sm font-semibold">
                  План проекта пока
                  распределён не полностью
                </p>

                <p className="mt-1 text-sm leading-6 opacity-85">
                  Распределено{" "}
                  <strong>
                    {
                      totalAllocatedWeight
                    }
                    %
                  </strong>
                  . Осталось распределить{" "}
                  <strong>
                    {
                      availableWeight
                    }
                    %
                  </strong>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Ошибка старых данных */}

      {totalAllocatedWeight >
        100 && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Доли этапов превышают
                100%
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                Сейчас распределено{" "}
                <strong>
                  {
                    totalAllocatedWeight
                  }
                  %
                </strong>
                . Необходимо уменьшить
                доли минимум на{" "}
                <strong>
                  {totalAllocatedWeight -
                    100}
                  %
                </strong>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Создание этапа */}

      {formMode ===
        "create" && (
        <div className="rounded-[1.5rem] border border-border bg-secondary/35 p-5 md:p-6">
          <p className="text-sm font-semibold text-primary">
            Новый этап
          </p>

          <h3 className="mt-1 text-lg font-bold text-foreground">
            Добавление этапа
            работ
          </h3>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Укажите название,
            стоимость, долю в общем
            прогрессе и плановые
            сроки.
          </p>

          {availableWeight ===
          0 ? (
            <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                <div>
                  <p className="text-sm font-semibold">
                    Свободной доли
                    больше нет
                  </p>

                  <p className="mt-1 text-sm leading-6 opacity-85">
                    Уже распределено
                    100% проекта.
                    Чтобы добавить
                    новый этап, сначала
                    уменьшите долю одного
                    из существующих этапов.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <ProjectStageForm
                projectId={
                  projectId
                }
                allocatedWeight={
                  totalAllocatedWeight
                }
                onClose={
                  closeForm
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Редактирование */}

      {formMode ===
        "edit" &&
        editingStage && (
          <div className="rounded-[1.5rem] border border-primary/20 bg-secondary/35 p-5 md:p-6">
            <p className="text-sm font-semibold text-primary">
              Редактирование
            </p>

            <h3 className="mt-1 text-lg font-bold text-foreground">
              {
                editingStage.title
              }
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              При редактировании
              текущая доля этого этапа
              временно исключается из
              общей суммы.
            </p>

            <div className="mt-5">
              <ProjectStageForm
                key={
                  editingStage.id
                }
                projectId={
                  projectId
                }
                stage={
                  editingStage
                }
                allocatedWeight={
                  totalAllocatedWeight -
                  Number(
                    editingStage.progress_weight ??
                      0
                  )
                }
                onClose={
                  closeForm
                }
              />
            </div>
          </div>
        )}

      {/* Успешное действие */}

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

      {/* Ошибка */}

      {errorMessage && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Не удалось выполнить
                действие
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

      {/* Пустой список */}

      {stages.length ===
      0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Plus className="h-5 w-5" />
          </div>

          <h3 className="mt-4 text-lg font-bold text-foreground">
            Этапы пока не
            созданы
          </h3>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Добавьте первый этап,
            чтобы сформировать план
            выполнения проекта.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map(
            (
              stage,
              index
            ) => {
              const isCurrentPending =
                isPending &&
                pendingStageId ===
                  stage.id;

              return (
                <ContractorStageCard
                  key={
                    stage.id
                  }
                  stage={
                    stage
                  }
                  index={
                    index
                  }
                  isPending={
                    isPending
                  }
                  isCurrentPending={
                    isCurrentPending
                  }
                  onEdit={
                    openEditForm
                  }
                  onDelete={
                    handleDelete
                  }
                  onAction={
                    handleStageAction
                  }
                />
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function WeightSummary({
  label,
  value,
  success = false,
  danger = false,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[1.25rem] border p-4",
        danger
          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          : success
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
            : "border-border bg-background/60",
      ].join(" ")}
    >
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-xl font-bold",
          danger
            ? "text-red-700 dark:text-red-300"
            : success
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}