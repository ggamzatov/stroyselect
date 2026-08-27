import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  FolderSearch,
  Mail,
  MapPin,
  SearchX,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { AdSlot } from "@/features/ads/components/ad-slot";
import { getAvailableProjects } from "@/features/projects/queries/get-available-projects";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function ContractorProjectsPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const { company, projects, debugMessage } = await getAvailableProjects();

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

  if (company.verification_status !== "verified") {
    return (
      <ContractorNotice
        title="Профиль ещё не подтверждён"
        description="Доступ к опубликованным проектам появится после проверки профиля администратором."
        href="/contractor/company"
        buttonText="Открыть профиль"
      />
    );
  }

  const invitedCount = projects.filter((project) => project.is_invited).length;
  const responseCount = projects.filter((project) =>
    project.project_bids?.some((bid) => bid.contractor_id === company.id)
  ).length;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <section className="ui-v2-panel relative overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_70%_45%,rgba(170,216,190,0.58),transparent_60%)] lg:block" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                Биржа проектов
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl">
                Подходящие заказы
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Проекты ранжируются по специализации, географии и совместимости бюджета. Приглашения заказчиков показываются первыми.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              <SummaryMetric label="Доступно" value={projects.length} />
              <SummaryMetric label="Приглашений" value={invitedCount} />
              <SummaryMetric label="С откликом" value={responseCount} />
            </div>
          </div>
        </section>

        {debugMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Диагностическое сообщение</p>
                <p className="mt-1 break-words text-sm leading-6 opacity-85">{debugMessage}</p>
              </div>
            </div>
          </div>
        ) : null}

        <AdSlot placement="project_feed" className="mt-4" />

        {projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <section className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Подходящие проекты">
            {projects.map((project) => {
              const myBid = project.project_bids?.find(
                (bid) => bid.contractor_id === company.id
              );

              return (
                <Link
                  key={project.id}
                  href={`/contractor/projects/${project.id}`}
                  className="group flex min-w-0 flex-col rounded-[1.35rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-card)] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
                          {Math.round(project.match_score)}% соответствия
                        </span>
                        {project.is_invited ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2dc] px-2.5 py-1 text-[11px] font-bold text-[#b96a00]">
                            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                            Приглашение
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-4 line-clamp-2 text-lg font-black tracking-[-0.025em] text-foreground sm:text-xl">
                        {project.title}
                      </h2>

                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">{project.city || "Город не указан"}</span>
                      </div>
                    </div>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition group-hover:border-primary/20 group-hover:bg-secondary">
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {getCategoryName(project.service_categories)}
                    </span>
                    {project.match_reasons.slice(0, 2).map((reason) => (
                      <span key={reason} className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground/75">
                        {reason}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {project.description}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5">
                    <ProjectInfo
                      icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
                      label="Бюджет"
                      value={formatBudget(project.budget_min, project.budget_max)}
                    />
                    <ProjectInfo
                      icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                      label="Старт"
                      value={project.desired_start_date ? formatDate(project.desired_start_date) : "Не указан"}
                    />
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="flex min-h-11 items-center justify-between rounded-xl bg-secondary/70 px-4 text-sm font-semibold text-primary">
                      <span className="flex min-w-0 items-center gap-2">
                        {myBid ? (
                          <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <BriefcaseBusiness className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate">
                          {myBid
                            ? "Отклик уже отправлен"
                            : project.is_invited
                              ? "Ответить на приглашение"
                              : "Посмотреть и откликнуться"}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                    </div>
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

function ProjectInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function EmptyProjects() {
  return (
    <section className="mt-5 flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card/70 px-6 text-center shadow-[var(--shadow-soft)]">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold">Подходящих проектов пока нет</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Новые опубликованные проекты, соответствующие вашему профилю, будут появляться здесь.
        </p>
      </div>
    </section>
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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[65vh] max-w-[900px] items-center justify-center">
        <section className="ui-v2-panel w-full max-w-xl p-7 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <BriefcaseBusiness className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <Link
            href={href}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
          >
            {buttonText}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function getCategoryName(value: { name: string } | Array<{ name: string }> | null) {
  return Array.isArray(value)
    ? (value[0]?.name ?? "Строительные работы")
    : (value?.name ?? "Строительные работы");
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`)
  );
}
