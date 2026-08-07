"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  useForm,
} from "react-hook-form";

import { zodResolver } from
  "@hookform/resolvers/zod";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Send,
  TriangleAlert,
} from "lucide-react";

import {
  BidFormInput,
  bidSchema,
  type BidInput,
} from "@/features/bids/schemas/bid-schema";

import { saveBid } from
  "@/features/bids/actions/save-bid";

type ExistingBid = {
  id: string;
  price: number | string;
  duration_days: number;
  message: string;
  proposed_start_date: string | null;
  status: string;
};

type Props = {
  projectId: string;
  existingBid: ExistingBid | null;
};

export function BidForm({
  projectId,
  existingBid,
}: Props) {
  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const locked =
    existingBid &&
    ![
      "submitted",
      "viewed",
      "shortlisted",
    ].includes(existingBid.status);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isDirty,
    },
  } = useForm<
    BidFormInput,
    unknown,
    BidInput
  >({
    resolver: zodResolver(
      bidSchema
    ),

    defaultValues: {
      projectId,

      price: existingBid
        ? Number(
            existingBid.price
          )
        : undefined,

      durationDays:
        existingBid?.duration_days ??
        undefined,

      message:
        existingBid?.message ?? "",

      proposedStartDate:
        existingBid
          ?.proposed_start_date ?? "",
    },
  });

  function onSubmit(
    values: BidInput
  ) {
    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result =
        await saveBid(values);

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setMessage(
        result.message
      );
    });
  }

  return (
    <form
      onSubmit={handleSubmit(
        onSubmit
      )}
      className="space-y-5"
    >
      <input
        type="hidden"
        {...register(
          "projectId"
        )}
      />

      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">
              {existingBid
                ? "Ваш отклик"
                : "Новый отклик"}
            </p>

            <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              {existingBid
                ? "Предложение по проекту"
                : "Отправить предложение"}
            </h3>
          </div>

          {existingBid && (
            <BidStatusBadge
              status={
                existingBid.status
              }
            />
          )}
        </div>

        {existingBid && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Текущий статус предложения:{" "}
            <span className="font-semibold text-foreground">
              {formatBidStatus(
                existingBid.status
              )}
            </span>
          </p>
        )}
      </div>

      {locked && (
        <div className="rounded-[1.25rem] border border-border bg-secondary/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LockKeyhole className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">
                Редактирование недоступно
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Текущий статус предложения
                больше не позволяет изменять
                стоимость, сроки или комментарий.
              </p>
            </div>
          </div>
        </div>
      )}

      <Field
        label="Стоимость работ"
        description="Укажите полную стоимость выполнения работ."
        icon={
          <Banknote className="h-4 w-4" />
        }
        error={
          errors.price?.message
        }
      >
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            disabled={
              Boolean(locked)
            }
            className="stroy-input pr-14 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            placeholder="Например, 1 500 000"
            {...register(
              "price",
              {
                valueAsNumber:
                  true,
              }
            )}
          />

          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted-foreground">
            ₽
          </span>
        </div>
      </Field>

      <Field
        label="Срок выполнения"
        description="Ориентировочное количество календарных дней."
        icon={
          <Clock3 className="h-4 w-4" />
        }
        error={
          errors.durationDays
            ?.message
        }
      >
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            disabled={
              Boolean(locked)
            }
            className="stroy-input pr-20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            placeholder="30"
            {...register(
              "durationDays",
              {
                valueAsNumber:
                  true,
              }
            )}
          />

          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-muted-foreground">
            дней
          </span>
        </div>
      </Field>

      <Field
        label="Возможная дата начала"
        description="Когда вы готовы приступить к работам."
        icon={
          <CalendarDays className="h-4 w-4" />
        }
        error={
          errors.proposedStartDate
            ?.message
        }
      >
        <input
          type="date"
          disabled={
            Boolean(locked)
          }
          className="stroy-input disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          {...register(
            "proposedStartDate"
          )}
        />
      </Field>

      <Field
        label="Комментарий заказчику"
        description="Расскажите об условиях, опыте, материалах и порядке выполнения работ."
        icon={
          <MessageSquareText className="h-4 w-4" />
        }
        error={
          errors.message?.message
        }
      >
        <textarea
          rows={7}
          disabled={
            Boolean(locked)
          }
          className="stroy-textarea disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          placeholder="Например: готовы выполнить работы под ключ. В стоимость входят работы по фундаменту, стенам и кровле..."
          {...register(
            "message"
          )}
        />
      </Field>

      {message && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Готово
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {message}
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
                Не удалось сохранить предложение
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {!locked && (
        <div className="border-t border-border pt-5">
          <button
            type="submit"
            disabled={
              isPending
            }
            className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </span>

              {isPending
                ? "Сохраняем..."
                : existingBid
                  ? "Обновить предложение"
                  : "Отправить предложение"}
            </span>

            {!isPending && (
              <span className="transition group-hover:translate-x-1">
                →
              </span>
            )}
          </button>

          {existingBid &&
            isDirty && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Есть несохранённые изменения.
              </p>
            )}
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  description,
  icon,
  error,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-primary">
              {icon}
            </span>
          )}

          <p className="text-sm font-semibold text-foreground">
            {label}
          </p>
        </div>

        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}

      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function BidStatusBadge({
  status,
}: {
  status: string;
}) {
  const config =
    getBidStatusConfig(status);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
        config.className,
      ].join(" ")}
    >
      <span
        className={[
          "mr-2 h-2 w-2 rounded-full",
          config.dotClassName,
        ].join(" ")}
      />

      {config.label}
    </span>
  );
}

function getBidStatusConfig(
  status: string
) {
  switch (status) {
    case "submitted":
      return {
        label: "Отправлено",
        className:
          "bg-secondary text-secondary-foreground",
        dotClassName:
          "bg-primary",
      };

    case "viewed":
      return {
        label: "Просмотрено",
        className:
          "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
        dotClassName:
          "bg-violet-500",
      };

    case "shortlisted":
      return {
        label: "В коротком списке",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        dotClassName:
          "bg-amber-500",
      };

    case "accepted":
      return {
        label: "Принято",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName:
          "bg-emerald-500",
      };

    case "rejected":
      return {
        label: "Отклонено",
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        dotClassName:
          "bg-red-500",
      };

    case "withdrawn":
      return {
        label: "Отозвано",
        className:
          "bg-muted text-muted-foreground",
        dotClassName:
          "bg-muted-foreground",
      };

    default:
      return {
        label: status,
        className:
          "bg-muted text-muted-foreground",
        dotClassName:
          "bg-muted-foreground",
      };
  }
}

function formatBidStatus(
  status: string
) {
  switch (status) {
    case "submitted":
      return "Отправлено";

    case "viewed":
      return "Просмотрено";

    case "shortlisted":
      return "В избранном у заказчика";

    case "accepted":
      return "Принято";

    case "rejected":
      return "Отклонено";

    case "withdrawn":
      return "Отозвано";

    default:
      return status;
  }
}