import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
  Send,
  TimerReset,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getAvailableProject } from "@/features/projects/queries/get-available-project";
import { getContractorProjectInvitation } from "@/features/projects/queries/get-contractor-project-invitation";
import { InvitationResponseCard } from "@/features/projects/components/invitation-response-card";
import { BidForm } from "@/features/bids/components/bid-form";

type Props = { params: Promise<{ id: string }> };

export default async function ContractorProjectPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (profile.role !== "contractor") redirect("/dashboard");

  const [{ project, existingBid }, invitation] = await Promise.all([
    getAvailableProject(id),
    getContractorProjectInvitation(id),
  ]);

  const categoryName = getCategoryName(project.service_categories);
  const propertyType = formatPropertyType(project.property_type);
  const budget = formatBudget(project.budget_min, project.budget_max);
  const startDate = formatDate(project.desired_start_date);
  const endDate = formatDate(project.desired_end_date);
  const publicationDate = formatShortDate(project.published_at);

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/contractor/projects"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            К подходящим заказам
          </Link>

          {existingBid ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Предложение уже отправлено
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <Send className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Можно откликнуться
            </span>
          )}
        </div>

        <section className="ui-v2-panel mt-4 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                  {categoryName}
                </span>
                {publicationDate ? (
                  <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    Опубликован {publicationDate}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 max-w-5xl text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
                {project.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                  {project.city || "Город не указан"}
                </span>
                {propertyType ? (
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    {propertyType}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <HeroMetric icon={<Banknote className="h-4 w-4" />} label="Бюджет заказчика" value={budget} strong />
              <HeroMetric icon={<CalendarDays className="h-4 w-4" />} label="Желаемое начало" value={startDate ?? "Не указано"} />
              <HeroMetric icon={<TimerReset className="h-4 w-4" />} label="Желаемое завершение" value={endDate ?? "Не указано"} />
            </div>
          </div>
        </section>

        {invitation ? (
          <div className="mt-5">
            <InvitationResponseCard invitation={invitation} />
          </div>
        ) : null}

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
          <div className="space-y-5">
            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="project-description-title">
              <SectionHeading
                icon={<FileText className="h-5 w-5" />}
                eyebrow="Задача"
                title="Что нужно сделать"
                description="Исходное описание проекта от заказчика без изменений и интерпретаций."
              />
              <div className="mt-5 rounded-2xl border border-border bg-background/65 p-4 sm:p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/85 sm:text-[15px]">
                  {project.description || "Заказчик не добавил подробное описание."}
                </p>
              </div>
            </section>

            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="project-object-title">
              <SectionHeading
                icon={<Building2 className="h-5 w-5" />}
                eyebrow="Объект"
                title="Место и тип работ"
                description="Данные, которые заказчик указал при публикации проекта."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailCard label="Тип объекта" value={propertyType} />
                <DetailCard label="Регион" value={project.region} />
                <DetailCard label="Город" value={project.city} />
                <DetailCard label="Адрес" value={project.address} />
              </div>
            </section>

            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="project-terms-title">
              <SectionHeading
                icon={<Banknote className="h-5 w-5" />}
                eyebrow="Ориентиры"
                title="Бюджет и сроки"
                description="Используйте эти значения как ориентир при подготовке собственного предложения."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <DetailCard label="Бюджет" value={budget} emphasized />
                <DetailCard label="Начало" value={startDate} />
                <DetailCard label="Завершение" value={endDate} />
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-24">
            <section className="ui-v2-panel overflow-hidden">
              <div className="border-b border-border bg-secondary/35 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Предложение подрядчика</p>
                    <h2 className="mt-2 text-xl font-black tracking-[-0.025em] text-foreground">
                      {existingBid ? "Проверьте условия" : "Откликнуться на проект"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Стоимость, сроки, объём работ и условия оплаты сохраняются в существующем формате предложения.
                    </p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>

                {existingBid ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniMetric label="Цена" value={formatMoney(existingBid.price)} />
                    <MiniMetric label="Срок" value={`${existingBid.duration_days} дн.`} />
                    <MiniMetric label="Полнота" value={`${existingBid.completeness_score ?? 0}%`} />
                  </div>
                ) : null}
              </div>

              <div className="p-4 sm:p-5">
                <BidForm
                  projectId={project.id}
                  existingBid={existingBid ? { ...existingBid, price: Number(existingBid.price) } : null}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/75 p-3.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className={["mt-2 leading-6 text-foreground", strong ? "text-lg font-black" : "text-sm font-bold"].join(" ")}>
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string | null | undefined;
  emphasized?: boolean;
}) {
  return (
    <div className={["rounded-2xl border border-border p-4", emphasized ? "bg-secondary/55" : "bg-background/65"].join(" ")}>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={["mt-2 text-foreground", emphasized ? "text-lg font-black" : "text-sm font-bold"].join(" ")}>
        {value || "Не указано"}
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-foreground">{value}</p>
    </div>
  );
}

function getCategoryName(value: { name: string } | Array<{ name: string }> | null) {
  if (Array.isArray(value)) return value[0]?.name ?? "Строительные работы";
  return value?.name ?? "Строительные работы";
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

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(date);
}

function formatShortDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}
