"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { publishProject } from
  "@/features/projects/actions/publish-project";

import { deleteProject } from
  "@/features/projects/actions/delete-project";

type Props = {
  projectId: string;
  status: string;
};

export function ProjectActions({
  projectId,
  status,
}: Props) {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

  function handlePublish() {
    const confirmed = window.confirm(
      "Опубликовать проект? После публикации его увидят подрядчики."
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result =
        await publishProject(projectId);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Удалить этот черновик? Отменить действие будет невозможно."
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result =
        await deleteProject(projectId);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      router.replace("/customer/projects");
      router.refresh();
    });
  }

  if (status !== "draft") {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold">
          Проект опубликован
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Подтверждённые подрядчики могут увидеть
          проект и отправить предложение.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">
        Управление проектом
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Проверьте данные перед публикацией.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handlePublish}
          className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {isPending
            ? "Выполняется..."
            : "Опубликовать"}
        </button>

        <Link
          href={`/customer/projects/${projectId}/edit`}
          className="rounded-xl border bg-white px-5 py-3 font-semibold"
        >
          Редактировать
        </Link>

        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="rounded-xl border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 disabled:opacity-60"
        >
          Удалить черновик
        </button>
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
    </div>
  );
}