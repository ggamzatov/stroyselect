import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { ProjectWorkActions } from
  "@/features/projects/components/project-work-actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContractorWorkProjectPage({
  params,
}: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: company, error: companyError } =
    await supabase
      .from("contractor_companies")
      .select(`
        id,
        owner_id,
        public_name
      `)
      .eq("owner_id", user.id)
      .maybeSingle();

  if (companyError) {
    console.error(
      "Ошибка загрузки компании:",
      companyError
    );

    return (
      <ErrorBox
        title="Не удалось загрузить компанию"
        text={companyError.message}
      />
    );
  }

  if (!company) {
    redirect("/contractor/company");
  }

  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select(`
        id,
        title,
        description,
        property_type,
        region,
        city,
        address,
        budget_min,
        budget_max,
        desired_start_date,
        desired_end_date,
        status,
        selected_contractor_id,
        selected_bid_id,
        contractor_selected_at,
        work_started_at,
        completed_at
      `)
      .eq("id", id)
      .maybeSingle();

  if (projectError) {
    console.error(
      "Ошибка загрузки рабочего проекта:",
      projectError
    );

    return (
      <ErrorBox
        title="Не удалось загрузить проект"
        text={[
          `Сообщение: ${projectError.message}`,
          `Код: ${projectError.code ?? "не указан"}`,
          `Подробности: ${
            projectError.details ?? "нет"
          }`,
          `Подсказка: ${
            projectError.hint ?? "нет"
          }`,
        ].join("\n")}
      />
    );
  }

  if (!project) {
    return (
      <ErrorBox
        title="Проект не найден или скрыт политикой RLS"
        text={[
          `Project ID: ${id}`,
          `User ID: ${user.id}`,
          `Company ID: ${company.id}`,
        ].join("\n")}
      />
    );
  }

  if (!project.selected_contractor_id) {
    return (
      <ErrorBox
        title="В проекте не назначен подрядчик"
        text={[
          `Проект: ${project.title}`,
          `Project ID: ${project.id}`,
          `Текущая компания: ${company.id}`,
          "selected_contractor_id = null",
        ].join("\n")}
      />
    );
  }

  if (
    project.selected_contractor_id !==
    company.id
  ) {
    return (
      <ErrorBox
        title="Проект назначен другой компании"
        text={[
          `Назначенная компания: ${project.selected_contractor_id}`,
          `Текущая компания: ${company.id}`,
        ].join("\n")}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/contractor/bids"
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться к предложениям
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Рабочая карточка проекта
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {project.title}
            </h1>

            <p className="mt-3 text-slate-600">
              {project.city}
              {project.address
                ? `, ${project.address}`
                : ""}
            </p>
          </div>

          <ProjectStatusBadge
            status={project.status}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Section title="Описание проекта">
              <p className="whitespace-pre-wrap leading-7 text-slate-700">
                {project.description}
              </p>
            </Section>

            <Section title="Объект">
              <InfoRow
                label="Тип объекта"
                value={formatPropertyType(
                  project.property_type
                )}
              />

              <InfoRow
                label="Регион"
                value={project.region}
              />

              <InfoRow
                label="Город"
                value={project.city}
              />

              <InfoRow
                label="Адрес"
                value={project.address}
              />
            </Section>

            <Section title="Бюджет">
              <InfoRow
                label="Минимальный бюджет"
                value={formatMoney(
                  project.budget_min
                )}
              />

              <InfoRow
                label="Максимальный бюджет"
                value={formatMoney(
                  project.budget_max
                )}
              />
            </Section>

            <Section title="Сроки">
              <InfoRow
                label="Желаемое начало"
                value={formatDate(
                  project.desired_start_date
                )}
              />

              <InfoRow
                label="Желаемое окончание"
                value={formatDate(
                  project.desired_end_date
                )}
              />

              <InfoRow
                label="Подрядчик назначен"
                value={formatDateTime(
                  project.contractor_selected_at
                )}
              />

              <InfoRow
                label="Работы начаты"
                value={formatDateTime(
                  project.work_started_at
                )}
              />

              <InfoRow
                label="Работы завершены"
                value={formatDateTime(
                  project.completed_at
                )}
              />
            </Section>
          </div>

          <aside>
            <ProjectWorkActions
              projectId={project.id}
              status={project.status}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid gap-1 border-b pb-3 last:border-0 md:grid-cols-[220px_1fr]">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="font-medium text-slate-900">
        {value || "Не указано"}
      </span>
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
      className={`rounded-full px-4 py-2 text-sm font-semibold ${config.className}`}
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

function formatPropertyType(
  value: string | null
) {
  switch (value) {
    case "apartment":
      return "Квартира";

    case "private_house":
      return "Частный дом";

    case "commercial":
      return "Коммерческий объект";

    case "land":
      return "Земельный участок";

    case "industrial":
      return "Производственный объект";

    case "other":
      return "Другое";

    default:
      return null;
  }
}

function formatMoney(
  value: number | string | null
) {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "long",
    }
  ).format(
    new Date(`${value}T00:00:00`)
  );
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

function ErrorBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-900">
            {title}
          </h1>

          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4 text-sm text-slate-800">
            {text}
          </pre>

          <Link
            href="/contractor/bids"
            className="mt-5 inline-flex font-semibold text-blue-700"
          >
            ← Вернуться к предложениям
          </Link>
        </div>
      </div>
    </main>
  );
}