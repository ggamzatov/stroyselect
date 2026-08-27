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
  Sparkles,
} from "lucide-react";

import { ProjectActions } from "@/features/projects/components/project-actions";
import { getMyProject } from "@/features/projects/queries/get-my-project";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerProjectPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const project = await getMyProject(id);
  const categoryName = getCategoryName(project);
  const propertyType = formatPropertyType(project.property_type) ?? "Не указан";
  const status = getStatusConfig(project.status);

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <Link
          href="/customer/projects"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-sm font-bold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Мои проекты
        </Link>

        <section className="ui-v2-panel relative mt-3 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[28%] bg-[radial-gradient(circle_at_70%_35%,rgba(170,216,190,0.45),transparent_62%)] lg:block" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <ProjectStatusBadge status={project.status} />
                <span className="text-xs font-bold text-primary">{categoryName}</span>
                <span className="text-xs text-muted-foreground">ID {project.id.slice(0, 8)}</span>
              </div>

              <h1 className="mt-3 break-words text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
                {project.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                  {project.city || "Город не указан"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                  Создан {formatDate(project.created_at)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-card/85 px-4 py-3 shadow-sm backdrop-blur">
              <span className={`h-2.5 w-2.5 rounded-full ${status.dotClassName}`} aria-hidden="true" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Статус</p>
                <p className="mt-0.5 text-sm font-black text-foreground">{status.label}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ключевые параметры проекта">
          <SummaryCard
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
            label="Тип объекта"
            value={propertyType}
          />
          <SummaryCard
            icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            label="Город"
            value={project.city || "Не указан"}
          />
          <SummaryCard
            icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
            label="Бюджет"
            value={formatBudgetRange(project.budget_min, project.budget_max)}
            emphasized
          />
          <SummaryCard
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            label="Желаемое начало"
            value={formatOptionalDate(project.desired_start_date) ?? "Не указано"}
          />
        </section>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <section className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Задача</p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">Описание проекта</h2>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground sm:text-base">
                {project.description || "Описание пока не заполнено."}
              </p>
            </section>

            <section className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Параметры</p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">Объект и объём работ</h2>
                </div>
                <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailCard label="Тип объекта" value={propertyType} />
                <DetailCard label="Категория" value={categoryName} />
                <DetailCard label="Регион" value={project.region} />
                <DetailCard label="Город" value={project.city} />
                <DetailCard label="Адрес" value={project.address} wide />
                {project.work_type ? <DetailCard label="Тип работ" value={project.work_type} /> : null}
                {project.dimensions ? <DetailCard label="Размеры / объём" value={project.dimensions} /> : null}
                {project.current_condition ? <DetailCard label="Текущее состояние" value={project.current_condition} wide /> : null}
                {project.scope_details ? <DetailCard label="Детали объёма" value={project.scope_details} wide /> : null}
              </div>
            </section>

            <section className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Планирование</p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">Бюджет и сроки</h2>
                </div>
                <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailCard label="Минимальный бюджет" value={formatMoney(project.budget_min)} emphasized />
                <DetailCard label="Максимальный бюджет" value={formatMoney(project.budget_max)} emphasized />
                <DetailCard label="Желаемое начало" value={formatOptionalDate(project.desired_start_date)} />
                <DetailCard label="Желаемое окончание" value={formatOptionalDate(project.desired_end_date)} />
                <DetailCard label="Дата публикации" value={formatOptionalDateTime(project.published_at)} wide />
              </div>
            </section>

            {(project.material_preferences || project.finish_level || project.design_readiness || project.permit_readiness) ? (
              <section className="ui-v2-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-black tracking-tight text-foreground">Дополнительные требования</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {project.material_preferences ? <DetailCard label="Материалы" value={project.material_preferences} wide /> : null}
                  {project.finish_level ? <DetailCard label="Уровень отделки" value={project.finish_level} /> : null}
                  {project.design_readiness ? <DetailCard label="Готовность дизайна" value={project.design_readiness} /> : null}
                  {project.permit_readiness ? <DetailCard label="Разрешения" value={project.permit_readiness} /> : null}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <section className="ui-v2-panel overflow-hidden">
              <div className="border-b border-border bg-secondary/35 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Следующее действие</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">Управление проектом</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Доступные действия зависят от текущего статуса проекта.
                </p>
              </div>
              <div className="p-4">
                <ProjectActions projectId={project.id} status={project.status} />
              </div>
            </section>

            <section className="ui-v2-panel p-5">
              <h2 className="text-base font-black text-foreground">О проекте</h2>
              <div className="mt-4 divide-y divide-border">
                <SmallInfoRow label="Создан" value={formatDate(project.created_at)} />
                <SmallInfoRow label="Категория" value={categoryName} />
                <SmallInfoRow label="Статус" value={status.label} />
                <SmallInfoRow label="Обновлён" value={formatDate(project.updated_at)} />
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
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="ui-v2-panel flex min-w-0 items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className={`mt-1 truncate ${emphasized ? "text-base font-black" : "text-sm font-bold"}`}>{value}</p>
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  emphasized = false,
  wide = false,
}: {
  label: string;
  value: string | null | undefined;
  emphasized?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={["rounded-xl border border-border bg-background/70 px-4 py-3", wide ? "sm:col-span-2" : ""].join(" ")}>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-1.5 whitespace-pre-wrap break-words text-foreground ${emphasized ? "text-base font-black" : "text-sm font-bold"}`}>
        {value || "Не указано"}
      </p>
    </div>
  );
}

function SmallInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${config.className}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${config.dotClassName}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case "draft":
      return { label: "Черновик", className: "bg-secondary text-secondary-foreground", dotClassName: "bg-primary" };
    case "published":
      return { label: "Опубликован", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", dotClassName: "bg-emerald-500" };
    case "matching":
      return { label: "Подбор подрядчиков", className: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300", dotClassName: "bg-violet-500" };
    case "contractor_selected":
      return { label: "Подрядчик выбран", className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300", dotClassName: "bg-indigo-500" };
    case "in_progress":
      return { label: "В работе", className: "bg-[#e8f5dc] text-[#4b7f13]", dotClassName: "bg-[#6da51e]" };
    case "completed":
      return { label: "Завершён", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300", dotClassName: "bg-green-500" };
    case "disputed":
      return { label: "Открыт спор", className: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300", dotClassName: "bg-orange-500" };
    case "cancelled":
      return { label: "Отменён", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300", dotClassName: "bg-red-500" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground", dotClassName: "bg-muted-foreground" };
  }
}

function getCategoryName(project: { service_categories: { name: string } | Array<{ name: string }> | null }) {
  return Array.isArray(project.service_categories)
    ? project.service_categories[0]?.name ?? "Строительные работы"
    : project.service_categories?.name ?? "Строительные работы";
}

function formatPropertyType(value: string | null) {
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

function formatMoney(value: number | string | null) {
  if (value === null) return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatBudgetRange(min: number | string | null, max: number | string | null) {
  const formattedMin = formatMoney(min);
  const formattedMax = formatMoney(max);
  if (formattedMin && formattedMax) return `${formattedMin} — ${formattedMax}`;
  if (formattedMin) return `От ${formattedMin}`;
  if (formattedMax) return `До ${formattedMax}`;
  return "Не указан";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

function formatOptionalDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(`${value}T00:00:00`));
}

function formatOptionalDateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
