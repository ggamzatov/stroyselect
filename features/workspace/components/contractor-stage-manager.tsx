"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { ProjectStageForm } from
  "@/features/workspace/components/project-stage-form";

import { deleteProjectStage } from
  "@/features/workspace/actions/delete-project-stage";

import { updateProjectStageStatus } from
  "@/features/workspace/actions/update-project-stage-status";

type Stage = {
  id: string;
  title: string;
  description: string | null;
  price: number | string | null;
  progress_weight: number;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
};

type Props = {
  projectId: string;
  stages: Stage[];
};

type FormMode =
  | "closed"
  | "create"
  | "edit";

export function ContractorStageManager({
  projectId,
  stages,
}: Props) {
  const router = useRouter();

  const [formMode, setFormMode] =
    useState<FormMode>("closed");

  const [
    editingStageId,
    setEditingStageId,
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
    pendingStageId,
    setPendingStageId,
  ] = useState<string | null>(null);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const editingStage =
    stages.find(
      (stage) =>
        stage.id === editingStageId
    ) ?? null;

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openCreateForm() {
    clearMessages();
    setEditingStageId(null);
    setFormMode("create");
  }

  function openEditForm(
    stageId: string
  ) {
    clearMessages();
    setEditingStageId(stageId);
    setFormMode("edit");
  }

  function closeForm() {
    setEditingStageId(null);
    setFormMode("closed");
  }

  function handleDelete(
    stage: Stage
  ) {
    const confirmed =
      window.confirm(
        `Удалить этап «${stage.title}»?`
      );

    if (!confirmed) {
      return;
    }

    clearMessages();
    setPendingStageId(stage.id);

    startTransition(async () => {
      try {
        const result =
          await deleteProjectStage(
            stage.id,
            projectId
          );

        if (!result.success) {
          setErrorMessage(
            result.message
          );
          return;
        }

        if (
          editingStageId === stage.id
        ) {
          closeForm();
        }

        setSuccessMessage(
          result.message
        );

        router.refresh();
      } finally {
        setPendingStageId(null);
      }
    });
  }

  function handleStageAction(
    stage: Stage,
    action: "start" | "complete"
  ) {
    const actionLabel =
      action === "start"
        ? "Начать"
        : "Завершить";

    const confirmed =
      window.confirm(
        `${actionLabel} этап «${stage.title}»?`
      );

    if (!confirmed) {
      return;
    }

    clearMessages();
    setPendingStageId(stage.id);

    startTransition(async () => {
      try {
        const result =
          await updateProjectStageStatus(
            stage.id,
            projectId,
            action
          );

        if (!result.success) {
          setErrorMessage(
            result.message
          );
          return;
        }

        if (
          editingStageId === stage.id
        ) {
          closeForm();
        }

        setSuccessMessage(
          result.message
        );

        router.refresh();
      } finally {
        setPendingStageId(null);
      }
    });
  }

  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Управление этапами
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Сформируйте план выполнения
            проекта и отмечайте ход работ.
          </p>
        </div>

        {formMode === "closed" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={openCreateForm}
            className="relative z-10 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Добавить этап
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={closeForm}
            className="relative z-10 rounded-xl border bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Закрыть форму
          </button>
        )}
      </div>

      {formMode === "create" && (
        <div className="mt-6 rounded-xl border bg-slate-50 p-5">
          <h3 className="mb-5 font-semibold">
            Новый этап
          </h3>

          <ProjectStageForm
            projectId={projectId}
            onClose={closeForm}
          />
        </div>
      )}

      {formMode === "edit" &&
        editingStage && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-5 font-semibold">
              Редактирование этапа
            </h3>

            <ProjectStageForm
              key={editingStage.id}
              projectId={projectId}
              stage={editingStage}
              onClose={closeForm}
            />
          </div>
        )}

      {successMessage && (
        <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {stages.length === 0 ? (
        <div className="mt-6 rounded-xl bg-slate-50 p-5">
          <p className="font-medium">
            Этапы пока не созданы
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Нажмите «Добавить этап»,
            чтобы сформировать план работ.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {stages.map(
            (stage, index) => {
              const isCurrentPending =
                isPending &&
                pendingStageId ===
                  stage.id;

              return (
                <article
                  key={stage.id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        Этап {index + 1}
                      </p>

                      <h3 className="mt-1 font-semibold">
                        {stage.title}
                      </h3>

                      {stage.description && (
                        <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {stage.description}
                        </p>
                      )}

                      <p className="mt-2 text-sm text-slate-600">
                        {formatMoney(
                          stage.price
                        )}
                        {" · "}
                        {
                          stage.progress_weight
                        }
                        %
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Статус:{" "}
                        {formatStatus(
                          stage.status
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatStageDates(
                          stage.planned_start_date,
                          stage.planned_end_date
                        )}
                      </p>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-2">
                      {stage.status ===
                        "planned" && (
                        <>
                          <button
                            type="button"
                            disabled={
                              isPending
                            }
                            onClick={() =>
                              handleStageAction(
                                stage,
                                "start"
                              )
                            }
                            className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isCurrentPending
                              ? "Сохраняем..."
                              : "Начать этап"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              isPending
                            }
                            onClick={() =>
                              openEditForm(
                                stage.id
                              )
                            }
                            className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Изменить
                          </button>

                          <button
                            type="button"
                            disabled={
                              isPending
                            }
                            onClick={() =>
                              handleDelete(
                                stage
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isCurrentPending
                              ? "Удаляем..."
                              : "Удалить"}
                          </button>
                        </>
                      )}

                      {stage.status ===
                        "in_progress" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleStageAction(
                              stage,
                              "complete"
                            )
                          }
                          className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isCurrentPending
                            ? "Сохраняем..."
                            : "Завершить этап"}
                        </button>
                      )}

                      {stage.status ===
                        "completed" && (
                        <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                          Этап завершён
                        </span>
                      )}

                      {stage.status ===
                        "cancelled" && (
                        <span className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                          Этап отменён
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

function formatMoney(
  value: number | string | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Стоимость не указана";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "Стоимость не указана";
  }

  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(numericValue);
}

function formatStatus(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
    planned: "Запланирован",
    in_progress: "Выполняется",
    completed: "Завершён",
    cancelled: "Отменён",
  };

  return labels[status] ?? status;
}

function formatStageDates(
  start: string | null,
  end: string | null
) {
  if (!start && !end) {
    return "Плановые даты не указаны";
  }

  if (start && end) {
    return `${formatDate(
      start
    )} — ${formatDate(end)}`;
  }

  if (start) {
    return `Начало: ${formatDate(
      start
    )}`;
  }

  return `Окончание: ${formatDate(
    end!
  )}`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
    }
  ).format(
    new Date(`${value}T00:00:00`)
  );
}