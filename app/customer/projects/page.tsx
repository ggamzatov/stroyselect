import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getMyProjects } from "@/features/projects/queries/get-my-projects";

export default async function CustomerProjectsPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const projects = await getMyProjects();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Кабинет заказчика
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Мои проекты
            </h1>

            <p className="mt-3 text-slate-600">
              Управляйте черновиками, опубликованными проектами
              и проектами в работе.
            </p>
          </div>

          <Link
            href="/customer/projects/new"
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
          >
            Создать проект
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">
              Проектов пока нет
            </h2>

            <p className="mt-2 text-slate-600">
              Создайте первый проект и опубликуйте его для
              подрядчиков.
            </p>

            <Link
              href="/customer/projects/new"
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              Создать первый проект
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/customer/projects/${project.id}`}
                className="block rounded-2xl border bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-blue-700">
                      {getCategoryName(
                        project.service_categories
                      )}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      {project.title}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      {project.city || "Город не указан"}
                    </p>
                  </div>

                  <ProjectStatusBadge
                    status={project.status}
                  />
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                  {project.description}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <InfoItem
                    label="Бюджет"
                    value={formatBudget(
                      project.budget_min,
                      project.budget_max
                    )}
                  />

                  <InfoItem
    label="Создан"
    value={formatDateTime(project.created_at) ?? "—"}
/>

                  <InfoItem
                    label="Опубликован"
                    value={
                      formatDateTime(
                        project.published_at
                      ) ?? "Не опубликован"
                    }
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function getCategoryName(
  value:
    | {
        id: string | number;
        name: string;
      }
    | Array<{
        id: string | number;
        name: string;
      }>
    | null
    | undefined
) {
  if (Array.isArray(value)) {
    return (
      value[0]?.name ??
      "Категория не указана"
    );
  }

  return (
    value?.name ??
    "Категория не указана"
  );
}

function ProjectStatusBadge({
  status,
}: {
  status: string;
}) {
  const config =
    getProjectStatusConfig(status);

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function getProjectStatusConfig(
  status: string
) {
  switch (status) {
    case "draft":
      return {
        label: "Черновик",
        className:
          "bg-slate-100 text-slate-700",
      };

    case "submitted":
      return {
        label: "Отправлен",
        className:
          "bg-blue-100 text-blue-800",
      };

    case "moderation":
      return {
        label: "На модерации",
        className:
          "bg-purple-100 text-purple-800",
      };

    case "needs_clarification":
      return {
        label: "Требует уточнения",
        className:
          "bg-orange-100 text-orange-800",
      };

    case "published":
      return {
        label: "Опубликован",
        className:
          "bg-green-100 text-green-800",
      };

    case "collecting_bids":
      return {
        label: "Сбор предложений",
        className:
          "bg-cyan-100 text-cyan-800",
      };

    case "contractor_selected":
      return {
        label: "Подрядчик выбран",
        className:
          "bg-indigo-100 text-indigo-800",
      };

    case "in_progress":
      return {
        label: "В работе",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "completed":
      return {
        label: "Завершён",
        className:
          "bg-emerald-100 text-emerald-800",
      };

    case "cancelled":
      return {
        label: "Отменён",
        className:
          "bg-red-100 text-red-800",
      };

    case "disputed":
      return {
        label: "Спор",
        className:
          "bg-rose-100 text-rose-800",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-700",
      };
  }
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatBudget(
  min: number | string | null,
  max: number | string | null
) {
  const formatter =
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    });

  if (min !== null && max !== null) {
    return `${formatter.format(
      Number(min)
    )} — ${formatter.format(
      Number(max)
    )}`;
  }

  if (min !== null) {
    return `От ${formatter.format(
      Number(min)
    )}`;
  }

  if (max !== null) {
    return `До ${formatter.format(
      Number(max)
    )}`;
  }

  return "Не указан";
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}