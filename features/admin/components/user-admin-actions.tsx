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

import { useRouter } from
  "next/navigation";

import { updateUserBlockStatus } from
  "@/features/admin/users/actions/update-user-block-status";

type Props = {
  userId: string;

  isBlocked:
    boolean;

  role:
    string;
};

export function UserAdminActions({
  userId,
  isBlocked,
  role,
}: Props) {
  const router =
    useRouter();

  const [
    showBlockForm,
    setShowBlockForm,
  ] =
    useState(false);

  const [
    reason,
    setReason,
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

  function blockUser() {
    if (
      reason.trim().length <
      3
    ) {
      setErrorMessage(
        "Укажите причину блокировки"
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Заблокировать пользователя? Доступ к сервису будет ограничен."
      );

    if (!confirmed) {
      return;
    }

    submitAction(
      "block",
      reason
    );
  }

  function unblockUser() {
    const confirmed =
      window.confirm(
        "Восстановить доступ пользователя?"
      );

    if (!confirmed) {
      return;
    }

    submitAction(
      "unblock",
      ""
    );
  }

  function submitAction(
    action:
      | "block"
      | "unblock",

    actionReason:
      string
  ) {
    setErrorMessage(
      null
    );

    setMessage(
      null
    );

    startTransition(
      async () => {
        const result =
          await updateUserBlockStatus({
            userId,

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
      {/* Status */}

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
            <p className="text-xs font-medium text-muted-foreground">
              Статус аккаунта
            </p>

            <p
              className={[
                "mt-0.5 font-bold",
                isBlocked
                  ? "text-red-800"
                  : "text-emerald-800",
              ].join(" ")}
            >
              {isBlocked
                ? "Заблокирован"
                : "Активен"}
            </p>
          </div>
        </div>
      </div>

      {!isBlocked ? (
        <>
          {!showBlockForm ? (
            <button
              type="button"
              disabled={
                isPending
              }
              onClick={() => {
                setShowBlockForm(
                  true
                );

                setMessage(
                  null
                );

                setErrorMessage(
                  null
                );
              }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />

              Заблокировать пользователя
            </button>
          ) : (
            <div className="rounded-[1.4rem] border border-red-200 bg-red-50/50 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <ShieldAlert className="h-4 w-4" />
                </span>

                <div>
                  <p className="font-semibold text-foreground">
                    Блокировка аккаунта
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Укажите конкретную причину. Она будет отправлена пользователю.
                  </p>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="text-sm font-semibold text-foreground">
                  Причина блокировки
                </span>

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
                    2000
                  }
                  placeholder="Например: нарушение правил платформы, жалобы пользователей..."
                  className="mt-2 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
                />

                <div className="mt-2 flex justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Минимум 3 символа
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {
                      reason.length
                    }
                    /2000
                  </p>
                </div>
              </label>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={
                    isPending
                  }
                  onClick={
                    blockUser
                  }
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" />

                  {isPending
                    ? "Блокируем..."
                    : "Подтвердить блокировку"}
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

                    setErrorMessage(
                      null
                    );
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
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
          onClick={
            unblockUser
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />

          {isPending
            ? "Восстанавливаем..."
            : "Восстановить доступ"}
        </button>
      )}

      {role ===
        "contractor" && (
        <p className="text-xs leading-5 text-muted-foreground">
          Блокировка аккаунта подрядчика
          применяется независимо от статуса
          проверки его компании.
        </p>
      )}

      {message && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

            {message}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <div className="flex items-start gap-2">
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