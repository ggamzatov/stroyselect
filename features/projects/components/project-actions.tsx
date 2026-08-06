import Link from "next/link";

import { PublishProjectButton } from
  "@/features/projects/components/publish-project-button";

type Props = {
  projectId: string;
  status: string;
};

export function ProjectActions({
  projectId,
  status,
}: Props) {
  const canOpenWorkspace = [
    "contractor_selected",
    "in_progress",
    "completed",
    "disputed",
  ].includes(status);

  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-950">
        Управление проектом
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Доступные действия зависят от текущего
        статуса проекта.
      </p>

      <div className="mt-5 space-y-3">
        {status === "draft" && (
          <>
            <Link
              href={`/customer/projects/${projectId}/edit`}
              className="flex w-full items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Редактировать проект
            </Link>

            <PublishProjectButton
              projectId={projectId}
            />
          </>
        )}

        {status === "published" && (
          <>
            <Link
              href={`/customer/bids?projectId=${projectId}`}
              className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Посмотреть предложения
            </Link>

            <p className="rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-800">
              Проект опубликован и доступен
              подходящим подрядчикам.
            </p>
          </>
        )}

        {status === "matching" && (
          <Link
            href={`/customer/bids?projectId=${projectId}`}
            className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Перейти к подбору подрядчика
          </Link>
        )}

        {canOpenWorkspace && (
          <Link
            href={`/customer/work/${projectId}`}
            className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Открыть рабочее пространство
          </Link>
        )}

        {status === "completed" && (
          <p className="rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
            Проект завершён. Рабочее пространство
            и история проекта доступны для просмотра.
          </p>
        )}

        {status === "disputed" && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            По проекту открыт спор. Продолжайте
            взаимодействие через рабочее пространство.
          </p>
        )}

        {status === "cancelled" && (
          <p className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
            Проект отменён. Доступные действия
            ограничены.
          </p>
        )}

        {![
          "draft",
          "published",
          "matching",
          "contractor_selected",
          "in_progress",
          "completed",
          "disputed",
          "cancelled",
        ].includes(status) && (
          <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
            Для текущего статуса действия пока
            недоступны.
          </p>
        )}
      </div>
    </section>
  );
}