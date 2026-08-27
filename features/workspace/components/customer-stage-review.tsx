"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bolt,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareText,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { reviewProjectStage } from "@/features/workspace/actions/review-project-stage";

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

export function CustomerStageReview({ projectId, stages }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reviewStages = stages.filter((stage) => stage.status === "awaiting_review");

  if (reviewStages.length === 0) return null;

  function handleDecision(stage: Stage, decision: "approve" | "revision") {
    const comment = comments[stage.id] ?? "";

    if (decision === "revision" && comment.trim().length < 2) {
      setErrorMessage("Укажите замечание подрядчику");
      return;
    }

    const confirmed = window.confirm(
      decision === "approve"
        ? `Принять этап «${stage.title}»? После подтверждения этап будет отмечен как завершённый.`
        : `Вернуть этап «${stage.title}» на доработку? Подрядчик увидит ваше замечание.`
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    setPendingStageId(stage.id);

    startTransition(async () => {
      try {
        const result = await reviewProjectStage({
          stageId: stage.id,
          projectId,
          decision,
          comment,
        });

        if (!result.success) {
          setErrorMessage(result.message);
          return;
        }

        setSuccessMessage(result.message);
        setComments((current) => ({ ...current, [stage.id]: "" }));
        router.refresh();
      } finally {
        setPendingStageId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {successMessage && (
        <div className="rounded-[1.15rem] border border-primary/15 bg-primary/5 p-4 text-sm text-primary">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Решение сохранено</p>
              <p className="mt-1 leading-6 text-foreground/75">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-[1.15rem] border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Не удалось выполнить действие</p>
              <p className="mt-1 text-sm leading-6">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {reviewStages.map((stage) => {
        const isCurrentPending = isPending && pendingStageId === stage.id;
        const comment = comments[stage.id] ?? "";
        const textareaId = `stage-review-comment-${stage.id}`;

        return (
          <article
            key={stage.id}
            className="overflow-hidden rounded-[1.35rem] border border-primary/15 bg-[linear-gradient(110deg,rgba(239,248,229,0.72),rgba(255,255,255,0.96))]"
          >
            <div className="flex flex-col gap-5 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_22px_rgba(0,122,78,0.16)]">
                  <Bolt className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                    Подрядчик завершил этап
                  </p>
                  <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                    {stage.title}
                  </h3>
                  {stage.submitted_for_review_at && (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      На проверке с {formatDateTime(stage.submitted_for_review_at)}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor={textareaId} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  Замечание подрядчику
                </label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Заполняйте только если хотите вернуть этап на доработку.
                </p>
                <textarea
                  id={textareaId}
                  rows={3}
                  maxLength={1000}
                  value={comment}
                  onChange={(event) =>
                    setComments((current) => ({
                      ...current,
                      [stage.id]: event.target.value,
                    }))
                  }
                  placeholder="Опишите, что нужно исправить..."
                  className="stroy-textarea mt-3 min-h-24 bg-card disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  disabled={isPending}
                />
                <div className="mt-1 flex justify-end">
                  <span className="text-[11px] text-muted-foreground">{comment.length}/1000</span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDecision(stage, "approve")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_22px_rgba(0,122,78,0.16)] transition hover:-translate-y-0.5 hover:bg-[#006a45] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
                >
                  {isCurrentPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isCurrentPending ? "Сохраняем..." : "Принять этап"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDecision(stage, "revision")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
                >
                  {isCurrentPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Есть замечания
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
