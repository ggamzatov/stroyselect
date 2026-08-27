import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  FolderKanban,
  MapPin,
  Plus,
  Search,
  Wallet,
} from "lucide-react";

import { getMyProjects } from "@/features/projects/queries/get-my-projects";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

const activeStatuses = new Set(["contractor_selected", "in_progress", "disputed"]);
const searchStatuses = new Set(["published", "collecting_bids", "matching"]);

export default async function CustomerProjectsPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const projects = await getMyProjects();
  const activeCount = projects.filter((project) => activeStatuses.has(project.status)).length;
  const searchingCount = projects.filter((project) => searchStatuses.has(project.status)).length;
  const completedCount = projects.filter((project) => project.status === "completed").length;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Проекты</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-foreground sm:text-4xl">
              Мои проекты
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Создавайте заявки, сравнивайте предложения и контролируйте объекты в работе из одного раздела.
            </p>
          </div>

          <Link
            href="/customer/projects/new"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_rgba(8,122,80,0.22)] transition hover:-translate-y-0.5 hover:bg-[#076c47]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Создать проект
          </Link>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Сводка по проектам">
          <SummaryCard
            icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />}
            label="Всего проектов"
            value={projects.length}
            tone="green"
          />
          <SummaryCard
            icon={<CircleDot className="h-5 w-5" aria-hidden="true" />}
            label="В работе"
            value={activeCount}
            tone="blue"
          />
          <SummaryCard
            icon={<Search className="h-5 w-5" aria-hidden="true" />}
            label="Ищут подрядчика"
            value={searchingCount}
            tone="orange"
          />
          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
            label="Завершено"
            value={completedCount}
            tone="green"
          />
        </section>

        <section className="mt-6" aria-labelledby="projects-list-title">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Все объекты</p>
              <h2 id="projects-list-title" className="mt-1 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                Проекты и заявки
              </h2>
            </div>
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {projects.length}
            </span>
          </div>

          {projects.length === 0 ? (
            <EmptyProjects />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProjectCard({
  project,
}: {
  project: {
    id: string;
    title: string;
    description: string | null;
    city: string | null;
    status: string;
    budget_min: number | string | null;
    budget_max: number | string | null;
    created_at: string | null;
    published_at: string | null;
    service_categories:
      | { id: string | number; name: string }
      | Array<{ id: string | number; name: string }>
      | null;
  };
}) {
  return (
    <Link
      href={`/customer/projects/${project.id}`}
      className="ui-v2-panel group block min-w-0 p-5 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-card)] sm:p-6"
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <span className="text-xs font-semibold text-muted-foreground">
              {getCategoryName(project.service_categories)}
            </span>
          </div>
          <h3 className="mt-3 line-clamp-2 break-words text-xl font-black tracking-[-0.025em] text-foreground">
            {project.title}
          </h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{project.city || "Город не указан"}</span>
          </div>
        </div>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {project.description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetaItem
          icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
          label="Бюджет"
          value={formatBudget(project.budget_min, project.budget_max)}
          emphasized
        />
        <MetaItem
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
          label={project.published_at ? "Опубликован" : "Создан"}
          value={formatDateTime(project.published_at ?? project.created_at) ?? "—"}
        />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-bold text-primary">Открыть проект</span>
        <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "green" | "blue" | "orange";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300"
      : tone === "orange"
        ? "bg-[#fff2dc] text-[#c2760a]"
        : "bg-secondary text-primary";

  return (
    <div className="ui-v2-panel flex items-center gap-4 p-4 sm:p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl font-black tracking-[-0.035em] text-foreground">{value}</p>
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MetaItem({
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
    <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className={`mt-1.5 break-words ${emphasized ? "text-base font-black" : "text-sm font-bold"}`}>{value}</p>
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="ui-v2-panel flex min-h-[360px] items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <FolderKanban className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-black tracking-tight text-foreground">Проектов пока нет</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Создайте первый проект, укажите задачу, бюджет и сроки. После публикации подрядчики смогут отправлять предложения.
        </p>
        <Link
          href="/customer/projects/new"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Создать первый проект
        </Link>
      </div>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const config = getProjectStatusConfig(status);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${config.className}`}>
      {config.label}
    </span>
  );
}

function getProjectStatusConfig(status: string) {
  switch (status) {
    case "draft":
      return { label: "Черновик", className: "bg-muted text-muted-foreground" };
    case "submitted":
      return { label: "Отправлен", className: "bg-secondary text-secondary-foreground" };
    case "moderation":
      return { label: "На модерации", className: "bg-violet-50 text-violet-700" };
    case "needs_clarification":
      return { label: "Требует уточнения", className: "bg-orange-50 text-orange-700" };
    case "published":
      return { label: "Опубликован", className: "bg-emerald-50 text-emerald-700" };
    case "collecting_bids":
      return { label: "Сбор предложений", className: "bg-cyan-50 text-cyan-700" };
    case "contractor_selected":
      return { label: "Подрядчик выбран", className: "bg-indigo-50 text-indigo-700" };
    case "in_progress":
      return { label: "В работе", className: "bg-[#e8f5dc] text-[#4b7f13]" };
    case "completed":
      return { label: "Завершён", className: "bg-emerald-50 text-emerald-700" };
    case "cancelled":
      return { label: "Отменён", className: "bg-red-50 text-red-700" };
    case "disputed":
      return { label: "Спор", className: "bg-rose-50 text-rose-700" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

function getCategoryName(
  value:
    | { id: string | number; name: string }
    | Array<{ id: string | number; name: string }>
    | null
    | undefined
) {
  return Array.isArray(value)
    ? value[0]?.name ?? "Категория не указана"
    : value?.name ?? "Категория не указана";
}

function formatBudget(min: number | string | null, max: number | string | null) {
  const formatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });

  if (min !== null && max !== null) return `${formatter.format(Number(min))} — ${formatter.format(Number(max))}`;
  if (min !== null) return `От ${formatter.format(Number(min))}`;
  if (max !== null) return `До ${formatter.format(Number(max))}`;
  return "Не указан";
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}
