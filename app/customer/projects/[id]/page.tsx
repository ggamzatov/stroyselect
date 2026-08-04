import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getMyProject } from
  "@/features/projects/queries/get-my-project";

import { ProjectActions } from
  "@/features/projects/components/project-actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerProjectPage({
  params,
}: Props) {
  const { id } = await params;

  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const project = await getMyProject(id);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/customer/projects"
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться к проектам
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              {getCategoryName(project)}
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              {project.title}
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              Создан: {formatDate(project.created_at)}
            </p>
          </div>

          <ProjectStatusBadge
            status={project.status}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <InfoSection title="Описание проекта">
              <p className="whitespace-pre-wrap leading-7 text-slate-700">
                {project.description}
              </p>
            </InfoSection>

            <InfoSection title="Объект">
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
            </InfoSection>

            <InfoSection title="Бюджет">
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
            </InfoSection>

            <InfoSection title="Сроки">
              <InfoRow
                label="Желаемое начало"
                value={formatOptionalDate(
                  project.desired_start_date
                )}
              />

              <InfoRow
                label="Желаемое окончание"
                value={formatOptionalDate(
                  project.desired_end_date
                )}
              />

              <InfoRow
                label="Дата публикации"
                value={formatOptionalDateTime(
                  project.published_at
                )}
              />
            </InfoSection>
          </div>

          <aside>
            <ProjectActions
              projectId={project.id}
              status={project.status}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoSection({
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
  const config = getStatusConfig(status);

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case "draft":
      return {
        label: "Черновик",
        className:
          "bg-blue-100 text-blue-800",
      };

    case "published":
      return {
        label: "Опубликован",
        className:
          "bg-green-100 text-green-800",
      };

    case "matching":
      return {
        label: "Подбор подрядчиков",
        className:
          "bg-purple-100 text-purple-800",
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
          "bg-slate-200 text-slate-800",
      };

    case "cancelled":
      return {
        label: "Отменён",
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

function getCategoryName(project: {
  service_categories:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
}) {
  if (Array.isArray(project.service_categories)) {
    return (
      project.service_categories[0]?.name ??
      "Строительные работы"
    );
  }

  return (
    project.service_categories?.name ??
    "Строительные работы"
  );
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatOptionalDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
  }).format(new Date(`${value}T00:00:00`));
}

function formatOptionalDateTime(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}