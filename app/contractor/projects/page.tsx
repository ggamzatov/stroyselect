import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getAvailableProjects } from
  "@/features/projects/queries/get-available-projects";

export default async function ContractorProjectsPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const { company, projects, debugMessage, } =
    await getAvailableProjects();
    {debugMessage && (
  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
    Ошибка диагностики: {debugMessage}
  </div>
)}
  if (!company) {
    return (
      <ContractorNotice
        title="Создайте профиль подрядчика"
        description="Перед просмотром проектов необходимо заполнить профиль компании."
        href="/contractor/company"
        buttonText="Создать профиль"
      />
    );
  }

  if (
    company.verification_status !== "verified"
  ) {
    return (
      <ContractorNotice
        title="Профиль ещё не подтверждён"
        description="Доступ к опубликованным проектам появится после проверки профиля администратором."
        href="/contractor/company"
        buttonText="Открыть профиль"
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <p className="text-sm text-slate-500">
            Кабинет подрядчика
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Доступные проекты
          </h1>

          <p className="mt-3 text-slate-600">
            Показаны проекты по вашим
            специализациям и городам работы.
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">
              Подходящих проектов пока нет
            </h2>

            <p className="mt-2 text-slate-600">
              Новые опубликованные проекты
              появятся здесь.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {projects.map((project) => {
              const myBid =
                project.project_bids?.find(
                  (bid) =>
                    bid.contractor_id ===
                    company.id
                );

              return (
                <Link
                  key={project.id}
                  href={`/contractor/projects/${project.id}`}
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

                    {myBid && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                        Предложение отправлено
                      </span>
                    )}
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {project.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
                    <span>
                      {formatBudget(
                        project.budget_min,
                        project.budget_max
                      )}
                    </span>

                    {project.desired_start_date && (
                      <span className="text-slate-500">
                        Начало:{" "}
                        {formatDate(
                          project.desired_start_date
                        )}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function ContractorNotice({
  title,
  description,
  href,
  buttonText,
}: {
  title: string;
  description: string;
  href: string;
  buttonText: string;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">
            {title}
          </h1>

          <p className="mt-3 text-slate-600">
            {description}
          </p>

          <Link
            href={href}
            className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
          >
            {buttonText}
          </Link>
        </div>
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

  return value?.name ??
    "Строительные работы";
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

  return "Бюджет не указан";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
    }
  ).format(new Date(`${value}T00:00:00`));
}