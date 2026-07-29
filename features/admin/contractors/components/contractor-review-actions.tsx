"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { reviewContractor } from
  "@/features/admin/contractors/actions/review-contractor";

type Props = {
  contractorId: string;
  currentStatus: string;
};

type Decision =
  | "approve"
  | "reject"
  | "suspend"
  | "return_to_draft";

export function ContractorReviewActions({
  contractorId,
  currentStatus,
}: Props) {
  const router = useRouter();

  const [decision, setDecision] =
    useState<Decision | null>(null);

  const [comment, setComment] =
    useState("");

  const [message, setMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isPending, startTransition] =
    useTransition();

  function handleDecision(
    selectedDecision: Decision
  ) {
    setDecision(selectedDecision);
    setMessage(null);
    setErrorMessage(null);

    if (selectedDecision === "approve") {
      submitDecision(selectedDecision, "");
    }
  }

  function submitDecision(
    selectedDecision: Decision,
    selectedComment: string
  ) {
    startTransition(async () => {
      const result = await reviewContractor({
        contractorId,
        decision: selectedDecision,
        comment: selectedComment,
      } as Parameters<
        typeof reviewContractor
      >[0]);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message);
      setDecision(null);
      setComment("");

      router.refresh();
    });
  }

  const requiresComment =
    decision === "reject" ||
    decision === "suspend" ||
    decision === "return_to_draft";

  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">
        Решение по профилю
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Текущий статус: {currentStatus}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {currentStatus === "pending" && (
          <>
            <Button
              type="button"
              disabled={isPending}
              onClick={() =>
                handleDecision("approve")
              }
            >
              Подтвердить
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                handleDecision("reject")
              }
            >
              Отклонить
            </Button>
          </>
        )}

        {currentStatus === "verified" && (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              handleDecision("suspend")
            }
          >
            Приостановить
          </Button>
        )}

        {currentStatus === "rejected" && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              handleDecision(
                "return_to_draft"
              )
            }
          >
            Вернуть в черновик
          </Button>
        )}

        {currentStatus === "suspended" && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              handleDecision(
                "return_to_draft"
              )
            }
          >
            Вернуть на редактирование
          </Button>
        )}
      </div>

      {requiresComment && decision && (
        <div className="mt-6 space-y-3">
          <label
            htmlFor="verification-comment"
            className="text-sm font-medium"
          >
            Комментарий администратора
          </label>

          <Textarea
            id="verification-comment"
            value={comment}
            onChange={(event) =>
              setComment(event.target.value)
            }
            rows={5}
            placeholder={
              decision === "reject"
                ? "Укажите, что именно необходимо исправить..."
                : "Укажите причину решения..."
            }
          />

          <div className="flex gap-3">
            <Button
              type="button"
              disabled={isPending}
              onClick={() =>
                submitDecision(
                  decision,
                  comment
                )
              }
            >
              {isPending
                ? "Сохраняем..."
                : "Подтвердить решение"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setDecision(null);
                setComment("");
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
    </section>
  );
}