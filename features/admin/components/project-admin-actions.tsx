"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  Ban,
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import { updateProjectAdminStatus } from
  "@/features/admin/projects/actions/update-project-admin-status";

type Props = {
  projectId: string;

  isBlocked: boolean;

  blockReason:
    string | null;
};

export function ProjectAdminActions({
  projectId,
  isBlocked,
  blockReason,
}: Props) {
  const router =
    useRouter();

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    showBlockForm,
    setShowBlockForm,
  ] =
    useState(false);

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

  function submit(
    action:
      | "block"
      | "unblock",

    actionReason:
      string
  ) {
    if (
      action ===
        "block" &&
      actionReason.trim()
        .length < 3
    ) {
      setErrorMessage(
        "Укажите причину блокировки"
      );

      return;
    }

    const confirmed =
      window.confirm(
        action === "block"
          ? "Заблокировать проект?"
          : "Восстановить проект?"
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage(
      null
    );

    setMessage(
      null
    );

    startTransition(
      async () => {
        const result =
          await updateProjectAdminStatus({
            projectId,

            action,

            reason:
              actionReason,
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

        setReason("");

        setShowBlockForm(
          false
        );

        router.refresh();
      }
    );
  }

  return (
    <div className="space-y-5">
      <div
        className={[
          "rounded-[1.25rem] border p-4",
          isBlocked
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          <span
            className={[
              "flex h-9 w-9 items-center justify-center rounded-xl",
              isBlocked
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700",
            ].join(" ")}
          >
            {isBlocked ? (
              <Ban className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </span>

          <div>
            <p className="text-xs text-muted-foreground">
              Административный статус
            </p>

            <p className="mt-0.5 font-bold text-foreground">
              {isBlocked
                ? "Заблокирован"
                : "Активен"}
            </p>
          </div>
        </div>

        {isBlocked &&
          blockReason && (
            <p className="mt-4 text-sm leading-6 text-red-800">
              {blockReason}
            </p>
          )}
      </div>

      {!isBlocked ? (
        <>
          {!showBlockForm ? (
            <button
              type="button"
              onClick={() =>
                setShowBlockForm(
                  true
                )
              }
              disabled={
                isPending
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />

              Ограничить проект
            </button>
          ) : (
            <div className="rounded-[1.4rem] border border-red-200 bg-red-50/50 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                <div>
                  <p className="font-semibold text-foreground">
                    Ограничение проекта
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Заказчик и подрядчик получат уведомление.
                  </p>
                </div>
              </div>

              <textarea
                value={
                  reason
                }
                onChange={(
                  event
                ) =>
                  setReason(
                    event.target
                      .value
                  )
                }
                rows={5}
                maxLength={
                  3000
                }
                placeholder="Причина ограничения проекта..."
                className="mt-4 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
              />

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={
                    isPending
                  }
                  onClick={() =>
                    submit(
                      "block",
                      reason
                    )
                  }
                  className="min-h-11 flex-1 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isPending
                    ? "Сохраняем..."
                    : "Ограничить"}
                </button>

                <button
                  type="button"
                  disabled={
                    isPending
                  }
                  onClick={() => {
                    setShowBlockForm(
                      false
                    );

                    setReason("");
                  }}
                  className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={
            isPending
          }
          onClick={() =>
            submit(
              "unblock",
              ""
            )
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />

          {isPending
            ? "Восстанавливаем..."
            : "Восстановить проект"}
        </button>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

            {message}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />

            {
              errorMessage
            }
          </div>
        </div>
      )}
    </div>
  );
}