import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getAssignedProjects } from
  "@/features/projects/queries/get-assigned-projects";

export default async function ContractorWorkPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const projects =
    await getAssignedProjects();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/contractor/dashboard"
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться в кабинет
        </Link>

        <div className="mt-6">
          <p className="text-sm text-slate-500">
            Кабинет подрядчика
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Мои объекты
          </h1>

          <p className="mt-3 text-slate-600">
            Проекты, по которым заказчик выбрал
            вашу компанию исполнителем.
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">
              Назначенных проектов пока нет
            </h2>

            <p className="mt-2 text-slate-600">
              После принятия вашего предложения
              проект появится здесь.
            </p>

            <Link
              href="/contractor/projects"
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
            >
              Найти проекты
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/contractor/work/${project.id}`}
                className="block rounded-2xl border bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-blue-700">
                      {getCategoryName(
                        project.service_categories
                      )}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold">
                      {project.title}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      {project.city}
                    </p>
                  </div>

                  <ProjectStatusBadge
                    status={project.status}
                  />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <InfoItem
                    label="Бюджет проекта"
                    value={formatBudget(
                      project.budget_min,
                      project.budget_max
                    )}
                  />

                  <InfoItem
                    label="Назначен"
                    value={
                      formatDateTime(
                        project.contractor_selected_at
                      ) ?? "Не указано"
                    }
                  />

                  <InfoItem
                    label="Начало работ"
                    value={
                      formatDateTime(
                        project.work_started_at
                      ) ?? "Не начаты"
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
    | { name: string }
    | Array<{ name: string }>
    | null
) {
  if (Array.isArray(value)) {
    return (
      value[0]?.name ??
      "Строительные работы"
    );
  }

  return (
    value?.name ??
    "Строительные работы"
  );
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

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
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
          "bg-green-100 text-green-800",
      };

    case "disputed":
      return {
        label: "Спор",
        className:
          "bg-red-100 text-red-800",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-700",
      };
  }
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