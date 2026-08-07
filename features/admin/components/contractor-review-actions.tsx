"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  XCircle,
} from "lucide-react";

import { reviewContractor } from
  "@/features/admin/contractors/actions/review-contractor";

type Props = {
  contractorId:
    string;

  currentStatus:
    string;
};

type Decision =
  | "approve"
  | "reject"
  | "suspend"
  | "resume"
  | "return_to_draft";

export function ContractorReviewActions({
  contractorId,
  currentStatus,
}: Props) {
  const router =
    useRouter();

  const [
    decision,
    setDecision,
  ] =
    useState<
      Decision | null
    >(null);

  const [
    comment,
    setComment,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  function handleDecision(
    selectedDecision:
      Decision
  ) {
    setMessage(null);
    setErrorMessage(null);

    /*
     * Подтверждение и восстановление
     * не требуют комментария.
     */
    if (
      selectedDecision ===
        "approve" ||
      selectedDecision ===
        "resume"
    ) {
      const config =
        getDecisionConfig(
          selectedDecision
        );

      const confirmed =
        window.confirm(
          config.confirmText
        );

      if (
        !confirmed
      ) {
        return;
      }

      submitDecision(
        selectedDecision,
        ""
      );

      return;
    }

    /*
     * Для остальных действий
     * показываем поле причины.
     */
    setDecision(
      selectedDecision
    );

    setComment("");
  }

  function submitDecision(
    selectedDecision:
      Decision,

    selectedComment:
      string
  ) {
    const config =
      getDecisionConfig(
        selectedDecision
      );

    if (
      config.requiresComment &&
      selectedComment.trim()
        .length < 3
    ) {
      setErrorMessage(
        "Укажите причину решения"
      );

      return;
    }

    if (
      config.requiresComment
    ) {
      const confirmed =
        window.confirm(
          config.confirmText
        );

      if (
        !confirmed
      ) {
        return;
      }
    }

    setErrorMessage(null);
    setMessage(null);

    startTransition(
      async () => {
        const result =
          await reviewContractor({
            contractorId,

            decision:
              selectedDecision,

            comment:
              selectedComment,
          });

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

        setDecision(
          null
        );

        setComment("");

        router.refresh();
      }
    );
  }

  function cancelDecision() {
    setDecision(
      null
    );

    setComment("");

    setErrorMessage(
      null
    );
  }

  const selectedConfig =
    decision
      ? getDecisionConfig(
          decision
        )
      : null;

  return (
    <div className="space-y-5">
      {/* Текущий статус */}

      <div className="rounded-[1.25rem] bg-secondary/60 p-4">
        <p className="text-xs font-medium text-muted-foreground">
          Текущий статус
        </p>

        <div className="mt-2 flex items-center gap-2">
          <StatusIcon
            status={
              currentStatus
            }
          />

          <p className="font-bold text-foreground">
            {formatStatus(
              currentStatus
            )}
          </p>
        </div>
      </div>

      {/* Pending */}

      {currentStatus ===
        "pending" && (
        <div className="space-y-3">
          <button
            type="button"
            disabled={
              isPending
            }
            onClick={() =>
              handleDecision(
                "approve"
              )
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />

            {isPending
              ? "Сохраняем..."
              : "Подтвердить подрядчика"}
          </button>

          <button
            type="button"
            disabled={
              isPending
            }
            onClick={() =>
              handleDecision(
                "reject"
              )
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />

            Отклонить профиль
          </button>
        </div>
      )}

      {/* Verified */}

      {currentStatus ===
        "verified" && (
        <button
          type="button"
          disabled={
            isPending
          }
          onClick={() =>
            handleDecision(
              "suspend"
            )
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
        >
          <ShieldAlert className="h-4 w-4" />

          Приостановить подрядчика
        </button>
      )}

      {/* Rejected */}

      {currentStatus ===
        "rejected" && (
        <button
          type="button"
          disabled={
            isPending
          }
          onClick={() =>
            handleDecision(
              "return_to_draft"
            )
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" />

          Вернуть на редактирование
        </button>
      )}

      {/* Suspended */}

      {currentStatus ===
        "suspended" && (
        <div className="space-y-3">
          <button
            type="button"
            disabled={
              isPending
            }
            onClick={() =>
              handleDecision(
                "resume"
              )
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />

            {isPending
              ? "Восстанавливаем..."
              : "Восстановить подрядчика"}
          </button>

          <button
            type="button"
            disabled={
              isPending
            }
            onClick={() =>
              handleDecision(
                "return_to_draft"
              )
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />

            Вернуть на редактирование
          </button>
        </div>
      )}

      {/* Draft */}

      {currentStatus ===
        "draft" && (
        <div className="rounded-[1.25rem] border border-dashed border-border bg-background/60 p-4">
          <p className="text-sm font-semibold text-foreground">
            Профиль редактируется
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Подрядчик должен исправить данные
            и самостоятельно повторно отправить
            профиль на проверку.
          </p>
        </div>
      )}

      {/* Форма причины */}

      {decision &&
        selectedConfig
          ?.requiresComment && (
          <div className="rounded-[1.4rem] border border-border bg-background/70 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <CircleAlert className="h-4 w-4" />
              </span>

              <div>
                <p className="font-semibold text-foreground">
                  {
                    selectedConfig.formTitle
                  }
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {
                    selectedConfig.description
                  }
                </p>
              </div>
            </div>

            <label
              htmlFor="verification-comment"
              className="mt-4 block"
            >
              <span className="text-sm font-semibold text-foreground">
                Комментарий администратора
              </span>

              <textarea
                id="verification-comment"
                value={
                  comment
                }
                onChange={(
                  event
                ) =>
                  setComment(
                    event.target
                      .value
                  )
                }
                rows={5}
                maxLength={
                  3000
                }
                placeholder={
                  selectedConfig.placeholder
                }
                className="mt-2 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Причина будет видна подрядчику.
                </p>

                <p className="text-xs text-muted-foreground">
                  {
                    comment.length
                  }
                  /3000
                </p>
              </div>
            </label>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={() =>
                  submitDecision(
                    decision,
                    comment
                  )
                }
                className={[
                  "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50",
                  selectedConfig.danger
                    ? "bg-red-700 text-white hover:bg-red-800"
                    : "bg-primary text-primary-foreground",
                ].join(
                  " "
                )}
              >
                {isPending
                  ? "Сохраняем..."
                  : selectedConfig.submitLabel}
              </button>

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  cancelDecision
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

      {/* Success */}

      {message && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

            <span>
              {message}
            </span>
          </div>
        </div>
      )}

      {/* Error */}

      {errorMessage && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <div className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />

            <span>
              {
                errorMessage
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({
  status,
}: {
  status:
    string;
}) {
  switch (status) {
    case "verified":
      return (
        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
      );

    case "pending":
      return (
        <ShieldAlert className="h-4 w-4 text-amber-700" />
      );

    case "rejected":
      return (
        <XCircle className="h-4 w-4 text-red-700" />
      );

    case "suspended":
      return (
        <ShieldAlert className="h-4 w-4 text-red-700" />
      );

    default:
      return (
        <Undo2 className="h-4 w-4 text-muted-foreground" />
      );
  }
}

function formatStatus(
  status:
    string
) {
  switch (status) {
    case "pending":
      return "Ожидает проверки";

    case "verified":
      return "Подтверждён";

    case "rejected":
      return "Отклонён";

    case "suspended":
      return "Приостановлен";

    case "draft":
      return "Черновик";

    default:
      return status;
  }
}

function getDecisionConfig(
  decision:
    Decision
) {
  switch (decision) {
    case "approve":
      return {
        requiresComment:
          false,

        danger:
          false,

        confirmText:
          "Подтвердить этого подрядчика? После подтверждения он сможет получать проекты и отправлять предложения.",

        formTitle:
          "",

        description:
          "",

        placeholder:
          "",

        submitLabel:
          "Подтвердить",
      };

    case "reject":
      return {
        requiresComment:
          true,

        danger:
          true,

        confirmText:
          "Отклонить профиль подрядчика? Указанная причина будет отправлена подрядчику.",

        formTitle:
          "Отклонение профиля",

        description:
          "Укажите конкретные причины, по которым профиль не может быть подтверждён.",

        placeholder:
          "Например: необходимо предоставить корректный ИНН и заполнить сведения о компании...",

        submitLabel:
          "Отклонить профиль",
      };

    case "suspend":
      return {
        requiresComment:
          true,

        danger:
          true,

        confirmText:
          "Приостановить работу подрядчика? Его доступ к новым проектам будет ограничен.",

        formTitle:
          "Приостановка подрядчика",

        description:
          "Укажите причину временного ограничения работы подрядчика.",

        placeholder:
          "Например: поступила жалоба, требуется дополнительная проверка документов...",

        submitLabel:
          "Приостановить",
      };

    case "resume":
      return {
        requiresComment:
          false,

        danger:
          false,

        confirmText:
          "Восстановить подрядчика? Его статус снова станет подтверждённым.",

        formTitle:
          "",

        description:
          "",

        placeholder:
          "",

        submitLabel:
          "Восстановить",
      };

    case "return_to_draft":
      return {
        requiresComment:
          true,

        danger:
          false,

        confirmText:
          "Вернуть профиль подрядчику на редактирование?",

        formTitle:
          "Возврат на редактирование",

        description:
          "Напишите, какие сведения подрядчику необходимо изменить или дополнить.",

        placeholder:
          "Например: дополните информацию о компании и исправьте контактные данные...",

        submitLabel:
          "Вернуть на редактирование",
      };
  }
}