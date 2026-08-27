import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  MapPin,
  Search,
  TriangleAlert,
} from "lucide-react";

import { getAssignedProjects } from "@/features/projects/queries/get-assigned-projects";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function ContractorWorkPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const projects = await getAssignedProjects();
  const activeCount = projects.filter((project) =>
    ["contractor_selected", "in_progress"].includes(project.status)
  ).length;
  const completedCount = projects.filter((project) => project.status === "completed").length;
  const disputedCount = projects.filter((project) => project.status === "disputed").length;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <section className="ui-v2-panel relative overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_70%_45%,rgba(170,216,190,0.55),transparent_60%)] lg:block" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                Выполнение работ
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl">
                Мои объекты
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Все проекты, где заказчик выбрал вашу компанию исполнителем: от подготовки договора до завершения работ.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              <SummaryMetric label="Активные" value={activeCount} />
              <SummaryMetric label="Завершены" value={completedCount} />
              <SummaryMetric label="Споры" value={disputedCount} />
            </div>
          </div>
        </section>

        {projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <section className="mt-5 grid gap-4 xl:grid-cols-2" aria-label="Объекты подрядчика">
            {projects.map((project) => {
              const acceptedPrice = project.project_bids?.price ?? null;

              return (
                <Link
                  key={project.id}
                  href={`/contractor/work/${project.id}`}
                  className="group block rounded-[1.35rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-card)] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ProjectStatusBadge status={project.status} />
                        <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          {getCategoryName(project.service_categories)}
                        </span>
                      </div>

                      <h2 className="mt-4 text-lg font-black tracking-[-0.025em] text-foreground sm:text-xl">
                        {project.title}
                      </h2>

                      <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">
                          {[project.city, project.address].filter(Boolean).join(", ") || "Адрес не указан"}
                        </span>
                      </div>
                    </div>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition group-hover:border-primary/20 group-hover:bg-secondary">
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <InfoItem
                      icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
                      label={acceptedPrice !== null ? "Сумма договора" : "Бюджет проекта"}
                      value={
                        acceptedPrice !== null
                          ? formatMoney(acceptedPrice)
                          : formatBudget(project.budget_min, project.budget_max)
                      }
                      emphasized
                    />
                    <InfoItem
                      icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                      label="Начало работ"
                      value={formatDateTime(project.work_started_at) ?? "Не начаты"}
                    />
                    <InfoItem
                      icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                      label="План завершения"
                      value={formatDateOnly(project.desired_end_date) ?? "Не указан"}
                    />
                  </div>

                  <div className="mt-5 flex min-h-11 items-center justify-between rounded-xl bg-secondary/70 px-4 text-sm font-semibold text-primary">
                    <span className="flex min-w-0 items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">Открыть рабочее пространство</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/85 px-3 py-3 text-center shadow-sm">
      <p className="text-xl font-black tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyProjects() {
  return (
    <section className="mt-5 flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card/70 px-6 text-center shadow-[var(--shadow-soft)]">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Search className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold">Назначенных проектов пока нет</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          После принятия вашего предложения проект появится здесь и станет доступен для работы.
        </p>
        <Link
          href="/contractor/projects"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
        >
          Найти проекты
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function getCategoryName(value: { name: string } | Array<{ name: string }> | null) {
  return Array.isArray(value)
    ? (value[0]?.name ?? "Строительные работы")
    : (value?.name ?? "Строительные работы");
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
    <div className={[
      "min-w-0 rounded-xl border border-border px-4 py-3",
      emphasized ? "bg-secondary/70" : "bg-background/70",
    ].join(" ")}>
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className={[
        "mt-1 truncate text-foreground",
        emphasized ? "text-base font-black" : "text-sm font-bold",
      ].join(" ")}>
        {value}
      </p>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const config = getProjectStatusConfig(status);
  const Icon = status === "completed" ? CheckCircle2 : status === "disputed" ? TriangleAlert : FolderKanban;

  return (
    <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", config.className].join(" ")}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function getProjectStatusConfig(status: string) {
  switch (status) {
    case "contractor_selected":
      return { label: "Подготовка к работам", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
    case "in_progress":
      return { label: "В работе", className: "bg-secondary text-primary" };
    case "completed":
      return { label: "Завершён", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" };
    case "disputed":
      return { label: "Спор", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatBudget(min: number | string | null, max: number | string | null) {
  const formatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });

  if (min !== null && max !== null) {
    return `${formatter.format(Number(min))} — ${formatter.format(Number(max))}`;
  }
  if (min !== null) return `От ${formatter.format(Number(min))}`;
  if (max !== null) return `До ${formatter.format(Number(max))}`;
  return "Не указан";
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateOnly(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}
