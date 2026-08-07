"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  CheckCircle2,
  Loader2,
  TriangleAlert,
} from "lucide-react";

import { completeProject } from
  "@/features/workspace/actions/complete-project";

type Stage = {
  id: string;
  status: string;
  progress_weight: number;
};

type Props = {
  projectId: string;
  projectStatus: string;
  stages: Stage[];
};

export function CompleteProjectButton({
  projectId,
  projectStatus,
  stages,
}: Props) {
  const router =
    useRouter();

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

  if (
    projectStatus ===
    "completed"
  ) {
    return (
      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Проект завершён
            </p>

            <p className="mt-1 text-sm opacity-80">
              Все работы по проекту подтверждены.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const completedStages =
    stages.filter(
      (stage) =>
        stage.status ===
        "completed"
    );

  const totalWeight =
    stages.reduce(
      (sum, stage) =>
        sum +
        Number(
          stage.progress_weight ??
            0
        ),
      0
    );

  const allStagesCompleted =
    stages.length > 0 &&
    completedStages.length ===
      stages.length;

  const canComplete =
    projectStatus ===
      "in_progress" &&
    allStagesCompleted &&
    totalWeight === 100;

  function handleComplete() {
    if (!canComplete) {
      return;
    }

    const confirmed =
      window.confirm(
        "Завершить проект? После подтверждения проект будет отмечен как завершённый, а вы сможете оставить отзыв подрядчику."
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    startTransition(
      async () => {
        const result =
          await completeProject(
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

        setSuccessMessage(
          result.message
        );

        router.refresh();
      }
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-border bg-background/60 p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-foreground">
            Завершение проекта
          </p>

          {canComplete ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Все этапы завершены и принято
              100% объёма проекта. Проект
              готов к окончательному завершению.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Чтобы завершить проект,
              необходимо принять все этапы
              и распределить между ними
              100% объёма проекта.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={
            !canComplete ||
            isPending
          }
          onClick={
            handleComplete
          }
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[#5c3b2a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Завершаем...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Завершить проект
            </>
          )}
        </button>
      </div>

      {!allStagesCompleted &&
        stages.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Завершено этапов:{" "}
            {completedStages.length}
            {" из "}
            {stages.length}.
          </p>
        )}

      {totalWeight !== 100 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />

          <p>
            Сейчас распределено{" "}
            <strong>
              {totalWeight}%
            </strong>{" "}
            проекта. Для завершения должно быть 100%.
          </p>
        </div>
      )}

      {successMessage && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}