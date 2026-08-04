"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

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

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

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
      const result = await updateBidStatus({
        bidId,
        decision,
      });

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  }

  if (isLocked) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {currentStatus === "submitted" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              handleDecision("viewed")
            }
            className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Отметить просмотренным
          </button>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            handleDecision("shortlisted")
          }
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-60"
        >
          В короткий список
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            handleDecision("accepted")
          }
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Принять
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            handleDecision("rejected")
          }
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
        >
          Отклонить
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}