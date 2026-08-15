"use client";

import Link from "next/link";
import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { startProjectWork } from
  "@/features/projects/actions/start-project-work";

type Props = {
  projectId: string;
  status: string;
};

export function ProjectWorkActions({
  projectId,
  status,
}: Props) {
  const router = useRouter();

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

  function handleStart() {
    const confirmed = window.confirm(
      "Подтвердить начало работ по проекту?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result =
        await startProjectWork(projectId);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  }

  if (status === "contractor_selected") {
    return (
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold">
          Начало работ
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          После фактического выхода на объект
          переведите проект в статус «В работе».
        </p>

        <button
          type="button"
          disabled={isPending}
          onClick={handleStart}
          className="mt-5 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Сохраняем..."
            : "Начать работы"}
        </button>

        <BudgetLink projectId={projectId} />

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
      </section>
    );
  }

  if (status === "in_progress") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-950">
          Проект находится в работе
        </h2>

        <p className="mt-2 text-sm text-amber-800">
          Фактическое начало работ уже
          зафиксировано.
        </p>

        <BudgetLink projectId={projectId} />
      </section>
    );
  }

  if (status === "completed") {
    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <h2 className="font-semibold text-green-950">
          Проект завершён
        </h2>

        <BudgetLink projectId={projectId} />
      </section>
    );
  }

  if (status === "disputed") {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-950">
          По проекту открыт спор
        </h2>

        <BudgetLink projectId={projectId} />
      </section>
    );
  }

  return null;
}

function BudgetLink({ projectId }: { projectId: string }) {
  return (
    <Link
      href={`/contractor/work/${projectId}/changes`}
      className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
    >
      Бюджет и изменения
    </Link>
  );
}
