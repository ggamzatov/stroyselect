"use client";

import { useState, useTransition } from "react";
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
      setErrorMessage("Добавьте короткое замечание, чтобы подрядчик понял, что нужно исправить.");
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
    <section className="space-y-4" aria-labelledby="stage-review-heading">
      <div className="rounded-[1.6rem] border border-primary/15 bg-[linear-gradient(135deg,rgba(239,248,229,0.92),rgba(255,255,255,0.98))] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_25px_rgba(0,122,78,0.14)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">Нужно ваше решение</p>
            <h2 id="stage-review-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Проверьте результат перед оплатой
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/70">
              Посмотрите, что сделал подрядчик. Примите этап, когда всё устраивает, или оставьте замечание для доработки.
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-primary">
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
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
            className="overflow-hidden rounded-[1.6rem] border border-border/80 bg-card shadow-[0_12px_35px_rgba(16,24,40,0.06)]"
          >
            <div className="border-b border-border/70 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">Этап готов</p>
                  <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">{stage.title}</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                  <Clock3 className="h-3.5 w-3.5" />
                  На проверке
                </span>
              </div>
              {stage.submitted_for_review_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Подрядчик отправил результат на проверку {formatDateTime(stage.submitted_for_review_at)}
                </p>
              )}
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-2xl bg-muted/55 p-4">
                <p className="text-sm font-semibold text-foreground">Как принять решение</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Всё хорошо — принимайте. Нужно исправить — опишите одну или несколько конкретных правок ниже.
                </p>
              </div>

              <div>
                <label htmlFor={textareaId} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  Замечания
                  <span className="font-normal text-muted-foreground">— необязательно</span>
                </label>
                <textarea
                  id={textareaId}
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(event) =>
                    setComments((current) => ({
                      ...current,
                      [stage.id]: event.target.value,
                    }))
                  }
                  placeholder="Например: поправьте затирку в правом углу и пришлите фото после исправления."
                  className="stroy-textarea mt-3 min-h-28 bg-card disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  disabled={isPending}
                />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Для возврата на доработку сообщение должно быть не пустым.</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{comment.length}/1000</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1.15fr_1fr]">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDecision(stage, "approve")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_rgba(0,122,78,0.14)] transition hover:-translate-y-0.5 hover:bg-[#006a45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
                >
                  {isCurrentPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isCurrentPending ? "Сохраняем..." : "Всё хорошо, принять"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDecision(stage, "revision")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
                >
                  {isCurrentPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Вернуть на доработку
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
