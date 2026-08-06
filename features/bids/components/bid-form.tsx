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
  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

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
    formState: { errors },
  } =useForm<
    BidFormInput,
  unknown,
  BidInput
>({
  resolver: zodResolver(bidSchema),

    defaultValues: {
      projectId,

      price: existingBid
        ? Number(existingBid.price)
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

  function onSubmit(values: BidInput) {
    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result = await saveBid(values);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border bg-white p-6"
    >
      <h2 className="text-xl font-semibold">
        {existingBid
          ? "Ваше предложение"
          : "Отправить предложение"}
      </h2>

      {existingBid && (
        <p className="mt-2 text-sm text-slate-600">
          Статус:{" "}
          {formatBidStatus(
            existingBid.status
          )}
        </p>
      )}

      <input
        type="hidden"
        {...register("projectId")}
      />

      <div className="mt-6 space-y-5">
        <Field label="Стоимость работ, ₽">
          <input
            type="number"
            disabled={Boolean(locked)}
            className="h-11 w-full rounded-lg border px-3"
            {...register("price", {
              valueAsNumber: true,
            })}
          />

          <ErrorText
            message={errors.price?.message}
          />
        </Field>

        <Field label="Срок выполнения, дней">
          <input
            type="number"
            disabled={Boolean(locked)}
            className="h-11 w-full rounded-lg border px-3"
            {...register("durationDays", {
              valueAsNumber: true,
            })}
          />

          <ErrorText
            message={
              errors.durationDays?.message
            }
          />
        </Field>

        <Field label="Возможная дата начала">
          <input
            type="date"
            disabled={Boolean(locked)}
            className="h-11 w-full rounded-lg border px-3"
            {...register(
              "proposedStartDate"
            )}
          />
        </Field>

        <Field label="Комментарий заказчику">
          <textarea
            rows={7}
            disabled={Boolean(locked)}
            className="w-full rounded-lg border p-3"
            placeholder="Опишите условия, опыт, материалы и порядок выполнения работ"
            {...register("message")}
          />

          <ErrorText
            message={errors.message?.message}
          />
        </Field>
      </div>

      {message && (
        <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!locked && (
        <button
          type="submit"
          disabled={isPending}
          className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {isPending
            ? "Сохраняем..."
            : existingBid
              ? "Обновить предложение"
              : "Отправить предложение"}
        </button>
      )}
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {label}
      </span>

      {children}
    </label>
  );
}

function ErrorText({
  message,
}: {
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-red-600">
      {message}
    </p>
  );
}

function formatBidStatus(status: string) {
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