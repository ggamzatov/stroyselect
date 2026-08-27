import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FolderKanban,
  MapPin,
  Megaphone,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";

import { getMyBidsCount } from "@/features/bids/queries/get-my-bids-count";
import { getMyContractorCompany } from "@/features/contractors/queries/get-my-contractor-company";
import { getAssignedProjects } from "@/features/projects/queries/get-assigned-projects";
import { getAvailableProjects } from "@/features/projects/queries/get-available-projects";
import { getAvailableProjectsCount } from "@/features/projects/queries/get-available-projects-count";
import { getContractorMarketplaceAccess } from "@/lib/subscriptions/contractor-marketplace-access";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function ContractorDashboardPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const company = await getMyContractorCompany();
  const access = company
    ? await getContractorMarketplaceAccess(company.id)
    : null;

  const [bidsCount, projectsCount, assignedProjects] = await Promise.all([
    getMyBidsCount(),
    getAvailableProjectsCount(),
    getAssignedProjects(),
  ]);

  const canLoadOpportunities = Boolean(
    company &&
      company.verification_status === "verified" &&
      company.accepts_new_projects &&
      access?.hasAccess
  );

  const opportunities = canLoadOpportunities
    ? (await getAvailableProjects()).projects.slice(0, 3)
    : [];

  const activeObjects = assignedProjects.filter(
    (project) => project.status !== "completed"
  );
  const recentObjects = activeObjects.slice(0, 3);
  const activeWorkValue = activeObjects.reduce(
    (sum, project) => sum + Number(project.project_bids?.price ?? 0),
    0
  );
  const firstName = profile.first_name || "подрядчик";
  const status = company?.verification_status ?? "not_created";

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <header className="mb-5 md:mb-7">
          <p className="text-sm font-medium text-muted-foreground">Кабинет подрядчика</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl">
            Добрый день, {firstName}! <span aria-hidden="true">👋</span>
          </h1>
        </header>

        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Ключевые показатели подрядчика"
        >
          <MetricCard
            href="/contractor/projects"
            icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />}
            value={projectsCount}
            title="подходящих заказов"
            subtitle="Доступно по вашему профилю"
          />
          <MetricCard
            href="/contractor/bids"
            icon={<BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />}
            value={bidsCount}
            title="предложений"
            subtitle="Отправлено заказчикам"
          />
          <MetricCard
            href="/contractor/work"
            icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
            value={activeObjects.length}
            title="активных объектов"
            subtitle="В работе сейчас"
          />
          <MetricCard
            href="/contractor/work"
            icon={<CircleDollarSign className="h-5 w-5" aria-hidden="true" />}
            value={formatMoney(activeWorkValue)}
            title="активных работ"
            subtitle="Сумма выбранных предложений"
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.72fr]">
          <div className="space-y-4">
            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="opportunities-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="opportunities-heading" className="text-lg font-black text-foreground sm:text-xl">
                      Подходящие заказы
                    </h2>
                    {projectsCount > 0 ? (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
                        {projectsCount} новых
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Подборка по специализации, географии и бюджету компании.
                  </p>
                </div>
                <Link href="/contractor/projects" className="text-sm font-semibold text-primary">
                  Смотреть все
                </Link>
              </div>

              {opportunities.length > 0 ? (
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {opportunities.map((project) => (
                    <OpportunityCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/50 p-5">
                  <p className="text-sm font-semibold text-foreground">
                    {canLoadOpportunities
                      ? "Новых подходящих заказов сейчас нет"
                      : "Подборка заказов пока недоступна"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {canLoadOpportunities
                      ? "Новые проекты появятся здесь автоматически."
                      : "Проверьте верификацию компании, приём новых заказов и доступ к маркетплейсу."}
                  </p>
                </div>
              )}
            </section>

            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="objects-heading">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="objects-heading" className="text-lg font-black text-foreground sm:text-xl">
                    Мои активные объекты
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Проекты, где ваша компания уже выбрана исполнителем.
                  </p>
                </div>
                <Link href="/contractor/work" className="text-sm font-semibold text-primary">
                  Смотреть все
                </Link>
              </div>

              {recentObjects.length > 0 ? (
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {recentObjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/contractor/work/${project.id}`}
                      className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
                          {project.status === "in_progress" ? "В работе" : "Активный"}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-base font-bold text-foreground">
                        {project.title}
                      </h3>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {project.city || "Город не указан"}
                      </p>
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground">Стоимость предложения</p>
                        <p className="mt-1 text-base font-black text-foreground">
                          {formatMoney(Number(project.project_bids?.price ?? 0))}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
                  Активных объектов пока нет. После выбора вашего предложения проект появится здесь.
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="company-heading">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Компания</p>
                  <h2 id="company-heading" className="mt-1 text-lg font-black text-foreground">
                    {company?.public_name || "Профиль не заполнен"}
                  </h2>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              {company ? (
                <>
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background/70 p-3">
                    <Star className="h-5 w-5 text-[#d68a14]" aria-hidden="true" />
                    <div>
                      <p className="text-lg font-black text-foreground">{formatRating(company.rating)}</p>
                      <p className="text-xs text-muted-foreground">{company.rating_count} оценок</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MiniMetric label="Завершено" value={company.completed_projects_count} />
                    <MiniMetric label="Специализаций" value={company.contractor_services.length} />
                  </div>
                </>
              ) : null}

              <div className="mt-4">
                <StatusLine status={status} />
              </div>

              <Link
                href="/contractor/company"
                className="mt-4 flex min-h-11 items-center justify-between rounded-xl border border-border px-4 text-sm font-semibold text-primary transition hover:bg-secondary"
              >
                Настройки компании
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>

            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="access-heading">
              <h2 id="access-heading" className="text-lg font-black text-foreground">Доступ к заказам</h2>
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-muted px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs leading-5 text-muted-foreground">
                  {access?.hasAccess
                    ? `Маркетплейс активен${access.planName ? ` · ${access.planName}` : ""}.`
                    : "Для доступа к подборке заказов нужна активная подписка и проверенный профиль."}
                </p>
              </div>
              <div className="mt-3 space-y-2">
                <ToolLink
                  href="/contractor/subscription"
                  icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
                  title="Подписка"
                  subtitle="Тариф и доступ к маркетплейсу"
                />
                <ToolLink
                  href="/contractor/advertising"
                  icon={<Megaphone className="h-4 w-4" aria-hidden="true" />}
                  title="Продвижение"
                  subtitle="Рекламные кампании компании"
                />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  href,
  icon,
  value,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  value: number | string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="ui-v2-panel group flex min-h-[132px] items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-card)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-black tracking-[-0.035em] text-foreground">{value}</span>
        <span className="mt-0.5 block text-sm font-bold text-foreground">{title}</span>
        <span className="mt-2 block text-xs leading-5 text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}

function OpportunityCard({
  project,
}: {
  project: Awaited<ReturnType<typeof getAvailableProjects>>["projects"][number];
}) {
  return (
    <Link
      href={`/contractor/projects/${project.id}`}
      className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-soft)]"
    >
      <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
        {Math.round(project.match_score)}% соответствия
      </span>
      <h3 className="mt-4 line-clamp-2 text-base font-bold text-foreground">{project.title}</h3>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        {project.city || project.region || "Регион не указан"}
      </p>
      <p className="mt-4 text-lg font-black text-foreground">
        {formatBudget(project.budget_min, project.budget_max)}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm font-semibold text-primary">
        Посмотреть заказ
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-black text-foreground">{value}</p>
    </div>
  );
}

function ToolLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 rounded-xl border border-border px-3 py-3 transition hover:border-primary/25 hover:bg-secondary/50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function StatusLine({ status }: { status: string }) {
  const config = getStatusConfig(status);

  return (
    <div className={["flex items-center gap-3 rounded-xl border px-4 py-3", config.className].join(" ")}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-current dark:bg-black/10">
        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-xs opacity-70">Статус профиля</span>
        <span className="block text-sm font-bold">{config.label}</span>
      </span>
    </div>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case "verified":
      return {
        label: "Подтверждён",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
      };
    case "pending":
      return {
        label: "На проверке",
        className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
      };
    case "rejected":
      return {
        label: "Нужны исправления",
        className: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200",
      };
    case "suspended":
      return {
        label: "Приостановлен",
        className: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200",
      };
    default:
      return {
        label: "Не заполнен",
        className: "border-border bg-muted text-muted-foreground",
      };
  }
}

function formatRating(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBudget(min: number | null, max: number | null) {
  if (min !== null && max !== null) return `${formatMoney(min)} — ${formatMoney(max)}`;
  if (min !== null) return `от ${formatMoney(min)}`;
  if (max !== null) return `до ${formatMoney(max)}`;
  return "Бюджет не указан";
}
