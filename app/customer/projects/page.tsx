import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getMyProjects } from
  "@/features/projects/queries/get-my-projects";

export default async function CustomerProjectsPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const projects = await getMyProjects();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Кабинет заказчика
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Мои проекты
            </h1>
          </div>

          <Link
            href="/customer/projects/new"
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
          >
            Создать проект
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">
              Проектов пока нет
            </h2>

            <p className="mt-2 text-slate-600">
              Создайте первую строительную заявку.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/customer/projects/${project.id}`}
                className="block rounded-2xl border bg-white p-6 hover:border-blue-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">
                      {project
                        .service_categories
                        ?.name ??
                        "Категория не указана"}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold">
                      {project.title}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      {project.city}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                    {formatProjectStatus(
                      project.status
                    )}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium">
                  {formatBudget(
                    project.budget_min,
                    project.budget_max
                  )}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function formatProjectStatus(
  status: string
) {
  switch (status) {
    case "draft":
      return "Черновик";

    case "published":
      return "Опубликован";

    case "matching":
      return "Подбор подрядчиков";

    case "contractor_selected":
      return "Подрядчик выбран";

    case "in_progress":
      return "В работе";

    case "completed":
      return "Завершён";

    case "cancelled":
      return "Отменён";

    default:
      return status;
  }
}

function formatBudget(
  min: number | string | null,
  max: number | string | null
) {
  const formatter = new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  );

  if (min !== null && max !== null) {
    return `${formatter.format(
      Number(min)
    )} — ${formatter.format(Number(max))}`;
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

  return "Бюджет не указан";
}