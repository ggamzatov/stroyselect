import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  Clock3,
  FileText,
  MapPin,
} from "lucide-react";

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

  const project =
    await getMyProject(id);

  const categoryName =
    getCategoryName(project);

  const propertyType =
    formatPropertyType(
      project.property_type
    );

  const budgetMin =
    formatMoney(
      project.budget_min
    );

  const budgetMax =
    formatMoney(
      project.budget_max
    );

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        {/* Верхняя навигация */}

        <Link
          href="/customer/projects"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Мои проекты
        </Link>

        {/* Главный блок */}

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-primary">
                  {categoryName}
                </p>

                <ProjectStatusBadge
                  status={project.status}
                />
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">
                {project.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />

                  <span>
                    {project.city ||
                      "Город не указан"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />

                  <span>
                    Создан{" "}
                    {formatDate(
                      project.created_at
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <div className="rounded-[1.5rem] border border-border bg-background/70 p-4 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Статус проекта
                </p>

                <div className="mt-3">
                  <ProjectStatusBadge
                    status={
                      project.status
                    }
                    large
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Краткий обзор */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <Building2 className="h-5 w-5" />
            }
            label="Тип объекта"
            value={
              propertyType ??
              "Не указан"
            }
          />

          <SummaryCard
            icon={
              <MapPin className="h-5 w-5" />
            }
            label="Город"
            value={
              project.city ||
              "Не указан"
            }
          />

          <SummaryCard
            icon={
              <Banknote className="h-5 w-5" />
            }
            label="Бюджет"
            value={
              formatBudgetRange(
                project.budget_min,
                project.budget_max
              )
            }
          />

          <SummaryCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Начало работ"
            value={
              formatOptionalDate(
                project.desired_start_date
              ) ?? "Не указано"
            }
          />
        </section>

        {/* Основной контент */}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {/* Описание */}

            <InfoSection
              icon={
                <FileText className="h-5 w-5" />
              }
              title="Описание проекта"
              description="Что необходимо выполнить по этому объекту."
            >
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground md:text-base">
                {project.description}
              </p>
            </InfoSection>

            {/* Объект */}

            <InfoSection
              icon={
                <Building2 className="h-5 w-5" />
              }
              title="Объект"
              description="Основная информация о месте проведения работ."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="Тип объекта"
                  value={propertyType}
                />

                <DetailCard
                  label="Регион"
                  value={project.region}
                />

                <DetailCard
                  label="Город"
                  value={project.city}
                />

                <DetailCard
                  label="Адрес"
                  value={project.address}
                />
              </div>
            </InfoSection>

            {/* Бюджет */}

            <InfoSection
              icon={
                <Banknote className="h-5 w-5" />
              }
              title="Бюджет"
              description="Ориентировочная стоимость проекта."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="Минимальный бюджет"
                  value={budgetMin}
                  emphasized
                />

                <DetailCard
                  label="Максимальный бюджет"
                  value={budgetMax}
                  emphasized
                />
              </div>
            </InfoSection>

            {/* Сроки */}

            <InfoSection
              icon={
                <CalendarDays className="h-5 w-5" />
              }
              title="Сроки"
              description="Желаемый период выполнения работ."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="Желаемое начало"
                  value={
                    formatOptionalDate(
                      project.desired_start_date
                    )
                  }
                />

                <DetailCard
                  label="Желаемое окончание"
                  value={
                    formatOptionalDate(
                      project.desired_end_date
                    )
                  }
                />

                <div className="sm:col-span-2">
                  <DetailCard
                    label="Дата публикации"
                    value={
                      formatOptionalDateTime(
                        project.published_at
                      )
                    }
                  />
                </div>
              </div>
            </InfoSection>
          </div>

          {/* Правая колонка */}

          <aside className="space-y-5 xl:sticky xl:top-24">
            <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="border-b border-border bg-secondary/35 px-6 py-5">
                <p className="text-sm font-semibold text-primary">
                  Управление
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                  Действия с проектом
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Публикуйте, редактируйте
                  проект и управляйте его
                  текущим статусом.
                </p>
              </div>

              <div className="p-5">
                <ProjectActions
                  projectId={
                    project.id
                  }
                  status={
                    project.status
                  }
                />
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <p className="text-sm font-semibold text-primary">
                О проекте
              </p>

              <div className="mt-5 space-y-4">
                <SmallInfoRow
                  label="Создан"
                  value={formatDate(
                    project.created_at
                  )}
                />

                <SmallInfoRow
                  label="Категория"
                  value={
                    categoryName
                  }
                />

                <SmallInfoRow
                  label="Статус"
                  value={
                    getStatusConfig(
                      project.status
                    ).label
                  }
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-base font-bold leading-6 text-foreground">
        {value}
      </p>
    </div>
  );
}

function InfoSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function DetailCard({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value:
    | string
    | null
    | undefined;
  emphasized?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-border p-4",
        emphasized
          ? "bg-secondary/55"
          : "bg-background/55",
      ].join(" ")}
    >
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-foreground",
          emphasized
            ? "text-lg font-bold"
            : "text-sm font-semibold",
        ].join(" ")}
      >
        {value || "Не указано"}
      </p>
    </div>
  );
}

function SmallInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function ProjectStatusBadge({
  status,
  large = false,
}: {
  status: string;
  large?: boolean;
}) {
  const config =
    getStatusConfig(status);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-semibold",
        large
          ? "px-4 py-2 text-sm"
          : "px-3 py-1.5 text-xs",
        config.className,
      ].join(" ")}
    >
      <span
        className={[
          "mr-2 rounded-full",
          large
            ? "h-2.5 w-2.5"
            : "h-2 w-2",
          config.dotClassName,
        ].join(" ")}
      />

      {config.label}
    </span>
  );
}

function getStatusConfig(
  status: string
) {
  switch (status) {
    case "draft":
      return {
        label: "Черновик",
        className:
          "bg-secondary text-secondary-foreground",
        dotClassName:
          "bg-primary",
      };

    case "published":
      return {
        label: "Опубликован",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName:
          "bg-emerald-500",
      };

    case "matching":
      return {
        label:
          "Подбор подрядчиков",
        className:
          "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
        dotClassName:
          "bg-violet-500",
      };

    case "contractor_selected":
      return {
        label:
          "Подрядчик выбран",
        className:
          "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
        dotClassName:
          "bg-indigo-500",
      };

    case "in_progress":
      return {
        label: "В работе",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        dotClassName:
          "bg-amber-500",
      };

    case "completed":
      return {
        label: "Завершён",
        className:
          "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
        dotClassName:
          "bg-green-500",
      };

    case "disputed":
      return {
        label: "Открыт спор",
        className:
          "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
        dotClassName:
          "bg-orange-500",
      };

    case "cancelled":
      return {
        label: "Отменён",
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        dotClassName:
          "bg-red-500",
      };

    default:
      return {
        label: status,
        className:
          "bg-muted text-muted-foreground",
        dotClassName:
          "bg-muted-foreground",
      };
  }
}

function getCategoryName(
  project: {
    service_categories:
      | {
          name: string;
        }
      | Array<{
          name: string;
        }>
      | null;
  }
) {
  if (
    Array.isArray(
      project.service_categories
    )
  ) {
    return (
      project
        .service_categories[0]
        ?.name ??
      "Строительные работы"
    );
  }

  return (
    project.service_categories
      ?.name ??
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
  value:
    | number
    | string
    | null
) {
  if (value === null) {
    return null;
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return null;
  }

  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(numericValue);
}

function formatBudgetRange(
  min:
    | number
    | string
    | null,
  max:
    | number
    | string
    | null
) {
  const formattedMin =
    formatMoney(min);

  const formattedMax =
    formatMoney(max);

  if (
    formattedMin &&
    formattedMax
  ) {
    return `${formattedMin} — ${formattedMax}`;
  }

  if (formattedMin) {
    return `От ${formattedMin}`;
  }

  if (formattedMax) {
    return `До ${formattedMax}`;
  }

  return "Не указан";
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
    }
  ).format(new Date(value));
}

function formatOptionalDate(
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
    new Date(
      `${value}T00:00:00`
    )
  );
}

function formatOptionalDateTime(
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