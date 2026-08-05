"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const [comments, setComments] =
    useState<Record<string, string>>({});

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [pendingStageId, setPendingStageId] =
    useState<string | null>(null);

  const [isPending, startTransition] =
    useTransition();

  const reviewStages = stages.filter(
    (stage) =>
      stage.status === "awaiting_review"
  );

  if (reviewStages.length === 0) {
    return null;
  }

  function handleDecision(
    stage: Stage,
    decision:
      | "approve"
      | "revision"
  ) {
    const comment =
      comments[stage.id] ?? "";

    if (
      decision === "revision" &&
      comment.trim().length < 2
    ) {
      setErrorMessage(
        "Укажите замечание подрядчику"
      );
      return;
    }

    const confirmed = window.confirm(
      decision === "approve"
        ? `Принять этап «${stage.title}»?`
        : `Вернуть этап «${stage.title}» на доработку?`
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setPendingStageId(stage.id);

    startTransition(async () => {
      try {
        const result =
          await reviewProjectStage({
            stageId: stage.id,
            projectId,
            decision,
            comment,
          });

        if (!result.success) {
          setErrorMessage(
            result.message
          );
          return;
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
    <section className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
      <h2 className="text-xl font-semibold">
        Этапы на проверке
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Проверьте выполненные работы и примите
        этап либо верните его подрядчику.
      </p>

      {successMessage && (
        <p className="mt-5 rounded-lg bg-green-100 p-3 text-sm text-green-800">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {reviewStages.map((stage) => {
          const isCurrentPending =
            isPending &&
            pendingStageId === stage.id;

          return (
            <article
              key={stage.id}
              className="rounded-xl border bg-white p-5"
            >
              <h3 className="font-semibold">
                {stage.title}
              </h3>

              {stage.submitted_for_review_at && (
                <p className="mt-2 text-xs text-slate-500">
                  Отправлен на проверку:{" "}
                  {formatDateTime(
                    stage.submitted_for_review_at
                  )}
                </p>
              )}

              <label className="mt-4 block">
                <span className="text-sm font-medium">
                  Замечание подрядчику
                </span>

                <textarea
                  rows={3}
                  value={
                    comments[stage.id] ?? ""
                  }
                  onChange={(event) =>
                    setComments((current) => ({
                      ...current,
                      [stage.id]:
                        event.target.value,
                    }))
                  }
                  placeholder="Заполняется только при возврате этапа на доработку"
                  className="mt-2 w-full rounded-lg border p-3"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    handleDecision(
                      stage,
                      "approve"
                    )
                  }
                  className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {isCurrentPending
                    ? "Сохраняем..."
                    : "Принять этап"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    handleDecision(
                      stage,
                      "revision"
                    )
                  }
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-amber-800 disabled:opacity-50"
                >
                  Вернуть на доработку
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
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