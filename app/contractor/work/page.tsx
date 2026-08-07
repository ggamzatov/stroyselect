import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  FolderKanban,
  MapPin,
  Search,
} from "lucide-react";

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
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link
          href="/contractor/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться в кабинет
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_25px_rgba(107,70,50,0.20)]">
              <FolderKanban className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-primary">
                Кабинет подрядчика
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">
                Мои объекты
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Здесь собраны проекты, по которым заказчик
                выбрал вашу компанию исполнителем.
              </p>
            </div>
          </div>
        </section>

        {projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <section className="mt-8 grid gap-5 xl:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/contractor/work/${project.id}`}
                className="group block overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
              >
                <div className="p-6 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-primary">
                        {getCategoryName(
                          project.service_categories
                        )}
                      </p>

                      <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                        {project.title}
                      </h2>

                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />

                        <span>
                          {project.city ||
                            "Город не указан"}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-3">
                      <ProjectStatusBadge
                        status={project.status}
                      />

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <InfoItem
                      icon={
                        <Banknote className="h-5 w-5" />
                      }
                      label="Бюджет проекта"
                      value={formatBudget(
                        project.budget_min,
                        project.budget_max
                      )}
                      emphasized
                    />

                    <InfoItem
                      icon={
                        <CalendarDays className="h-5 w-5" />
                      }
                      label="Назначен"
                      value={
                        formatDateTime(
                          project.contractor_selected_at
                        ) ?? "Не указано"
                      }
                    />

                    <InfoItem
                      icon={
                        <CalendarDays className="h-5 w-5" />
                      }
                      label="Начало работ"
                      value={
                        formatDateTime(
                          project.work_started_at
                        ) ?? "Не начаты"
                      }
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Building2 className="h-4 w-4" />
                      Открыть рабочее пространство
                    </div>

                    <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function EmptyProjects() {
  return (
    <section className="mt-8 flex min-h-[420px] items-center justify-center rounded-[2rem] border border-dashed border-border bg-card/70 px-6 text-center shadow-[var(--shadow-soft)]">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-secondary text-primary">
          <Search className="h-7 w-7" />
        </div>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
          Назначенных проектов пока нет
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          После принятия вашего предложения проект
          появится здесь и станет доступен для работы.
        </p>

        <Link
          href="/contractor/projects"
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a]"
        >
          <Search className="h-5 w-5" />
          Найти проекты
        </Link>
      </div>
    </section>
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
  icon,
  label,
  value,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-border p-4",
        emphasized
          ? "bg-secondary/60"
          : "bg-background/60",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-primary">
        {icon}

        <p className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
      </div>

      <p
        className={[
          "mt-2 text-foreground",
          emphasized
            ? "text-lg font-bold"
            : "text-sm font-semibold",
        ].join(" ")}
      >
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
      className={[
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
        config.className,
      ].join(" ")}
    >
      <span
        className={[
          "mr-2 h-2 w-2 rounded-full",
          config.dotClassName,
        ].join(" ")}
      />

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
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName:
          "bg-emerald-500",
      };

    case "disputed":
      return {
        label: "Спор",
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

function formatBudget(
  min: number | string | null,
  max: number | string | null
) {
  const formatter =
    new Intl.NumberFormat(
      "ru-RU",
      {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
      }
    );

  if (
    min !== null &&
    max !== null
  ) {
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
  ).format(
    new Date(value)
  );
}