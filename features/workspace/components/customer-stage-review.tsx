"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { reviewProjectStage } from
  "@/features/workspace/actions/review-project-stage";

type Stage = {
  id: string;
  title: string;
  status: string;
  customer_review_comment: string | null;
  submitted_for_review_at: string | null;
};

type Props = {
  projectId: string;
  stages: Stage[];
};

export function CustomerStageReview({
  projectId,
  stages,
}: Props) {
  const router =
    useRouter();

  const [
    comments,
    setComments,
  ] =
    useState<
      Record<string, string>
    >({});

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

  const reviewStages =
    stages.filter(
      (stage) =>
        stage.status ===
        "awaiting_review"
    );

  if (
    reviewStages.length === 0
  ) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-foreground">
          Нет этапов на проверке
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Когда подрядчик завершит этап
          и отправит его на приёмку,
          он появится здесь.
        </p>
      </div>
    );
  }

  function handleDecision(
    stage: Stage,
    decision:
      | "approve"
      | "revision"
  ) {
    const comment =
      comments[stage.id] ??
      "";

    if (
      decision ===
        "revision" &&
      comment.trim().length <
        2
    ) {
      setErrorMessage(
        "Укажите замечание подрядчику"
      );

      return;
    }

    const confirmed =
      window.confirm(
        decision ===
          "approve"
          ? `Принять этап «${stage.title}»? После подтверждения этап будет отмечен как завершённый.`
          : `Вернуть этап «${stage.title}» на доработку? Подрядчик увидит ваше замечание.`
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    setPendingStageId(
      stage.id
    );

    startTransition(
      async () => {
        try {
          const result =
            await reviewProjectStage(
              {
                stageId:
                  stage.id,

                projectId,

                decision,

                comment,
              }
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

          setComments(
            (
              current
            ) => ({
              ...current,
              [stage.id]:
                "",
            })
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
    <div className="space-y-5">
      <div className="rounded-[1.4rem] border border-violet-200 bg-violet-50 p-4 text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-semibold">
              Требуется ваше решение
            </p>

            <p className="mt-1 text-sm leading-6 opacity-85">
              Проверьте выполненные
              работы. Если результат
              соответствует договорённостям —
              примите этап. Если есть
              замечания — верните его
              подрядчику на доработку.
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Решение сохранено
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
                Не удалось выполнить действие
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {reviewStages.map(
          (stage) => {
            const isCurrentPending =
              isPending &&
              pendingStageId ===
                stage.id;

            const comment =
              comments[
                stage.id
              ] ?? "";

            return (
              <article
                key={
                  stage.id
                }
                className="rounded-[1.5rem] border border-border bg-background/60 p-5 md:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                        На приёмке
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
                      {
                        stage.title
                      }
                    </h3>

                    {stage.submitted_for_review_at && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="h-4 w-4 text-primary" />

                        <span>
                          Отправлен на проверку{" "}
                          {formatDateTime(
                            stage.submitted_for_review_at
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4 text-primary" />

                    <p className="text-sm font-semibold text-foreground">
                      Замечание подрядчику
                    </p>
                  </div>

                  <p className="mb-2 text-xs leading-5 text-muted-foreground">
                    Заполняйте это поле,
                    если хотите вернуть
                    этап на доработку.
                  </p>

                  <textarea
                    rows={4}
                    maxLength={
                      1000
                    }
                    value={
                      comment
                    }
                    onChange={(
                      event
                    ) =>
                      setComments(
                        (
                          current
                        ) => ({
                          ...current,

                          [stage.id]:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="Например: необходимо устранить трещину на участке стены и повторно приложить фото результата."
                    className="stroy-textarea disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    disabled={
                      isPending
                    }
                  />

                  <div className="mt-2 flex justify-end">
                    <span className="text-[11px] text-muted-foreground">
                      {
                        comment.length
                      }
                      /1000
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      handleDecision(
                        stage,
                        "approve"
                      )
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(21,128,61,0.16)] transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
                  >
                    {isCurrentPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}

                    {isCurrentPending
                      ? "Сохраняем..."
                      : "Принять этап"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      handleDecision(
                        stage,
                        "revision"
                      )
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-100 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    {isCurrentPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}

                    Вернуть на доработку
                  </button>
                </div>

                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  После принятия этап
                  будет отмечен как
                  завершённый. Для возврата
                  на доработку необходимо
                  указать замечание.
                </p>
              </article>
            );
          }
        )}
      </div>
    </div>
  );
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}