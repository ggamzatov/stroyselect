"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import {
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";

import { updateBidStatus } from
  "@/features/bids/actions/update-bid-status";

type Props = {
  bidId: string;
  currentStatus: string;
};

type Decision =
  | "viewed"
  | "shortlisted"
  | "accepted"
  | "rejected";

export function CustomerBidActions({
  bidId,
  currentStatus,
}: Props) {
  const router = useRouter();

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

  const isLocked = [
    "accepted",
    "rejected",
    "withdrawn",
  ].includes(currentStatus);

  function handleDecision(
    decision: Decision
  ) {
    if (
      decision === "accepted" &&
      !window.confirm(
        "Принять предложение? Остальные предложения по проекту будут отклонены."
      )
    ) {
      return;
    }

    if (
      decision === "rejected" &&
      !window.confirm(
        "Отклонить предложение подрядчика?"
      )
    ) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result =
        await updateBidStatus({
          bidId,
          decision,
        });

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setMessage(
        result.message
      );

      router.refresh();
    });
  }

  if (isLocked) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {currentStatus === "submitted" && (
          <ActionButton
            disabled={isPending}
            onClick={() =>
              handleDecision(
                "viewed"
              )
            }
            icon={
              isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )
            }
          >
            Отметить просмотренным
          </ActionButton>
        )}

        <ActionButton
          disabled={isPending}
          onClick={() =>
            handleDecision(
              "shortlisted"
            )
          }
          variant="warning"
          icon={
            <Star className="h-4 w-4" />
          }
        >
          В короткий список
        </ActionButton>

        <ActionButton
          disabled={isPending}
          onClick={() =>
            handleDecision(
              "accepted"
            )
          }
          variant="primary"
          icon={
            <Check className="h-4 w-4" />
          }
        >
          Принять
        </ActionButton>

        <ActionButton
          disabled={isPending}
          onClick={() =>
            handleDecision(
              "rejected"
            )
          }
          variant="danger"
          icon={
            <X className="h-4 w-4" />
          }
        >
          Отклонить
        </ActionButton>
      </div>

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
                Не удалось изменить статус
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  icon,
  variant = "default",
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  variant?:
    | "default"
    | "primary"
    | "warning"
    | "danger";
  disabled?: boolean;
  onClick: () => void;
}) {
  const styles = {
    default:
      "border border-border bg-card text-foreground hover:border-primary/25 hover:bg-secondary/50",

    primary:
      "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(107,70,50,0.18)] hover:-translate-y-0.5 hover:bg-[#5c3b2a]",

    warning:
      "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",

    danger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        "disabled:pointer-events-none disabled:opacity-50",
        styles[variant],
      ].join(" ")}
    >
      {icon}

      {children}
    </button>
  );
}