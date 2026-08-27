import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
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
import { getAvailableProjectsCount } from "@/features/projects/queries/get-available-projects-count";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function ContractorDashboardPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const [company, bidsCount, projectsCount, assignedProjects] = await Promise.all([
    getMyContractorCompany(),
    getMyBidsCount(),
    getAvailableProjectsCount(),
    getAssignedProjects(),
  ]);

  const status = company?.verification_status ?? "not_created";
  const activeObjects = assignedProjects.filter((project) => project.status !== "completed");
  const recentObjects = activeObjects.slice(0, 2);
  const firstName = profile.first_name || "подрядчик";

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <div className="mb-5 md:mb-7">
          <p className="text-sm font-medium text-muted-foreground">Кабинет подрядчика</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl">
            Добро пожаловать, {firstName}!
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Находите новые проекты, отправляйте предложения и управляйте текущими объектами из одного кабинета.
          </p>
        </div>

        <section className="ui-v2-panel relative overflow-hidden p-5 sm:p-6 lg:p-7" aria-labelledby="contractor-opportunities-title">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36%] bg-[radial-gradient(circle_at_65%_45%,rgba(170,216,190,0.62),transparent_58%)] lg:block" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Новые проекты</p>
              <h2 id="contractor-opportunities-title" className="mt-2 text-2xl font-black tracking-[-0.03em] text-foreground sm:text-3xl">
                {projectsCount > 0
                  ? `Доступно ${projectsCount} ${pluralizeProject(projectsCount)}`
                  : "Подходящих проектов пока нет"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Подборка учитывает профиль компании, специализации, географию работы и действующие правила доступа к заказам.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/contractor/projects"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.24)] transition hover:-translate-y-0.5 hover:bg-[#076c47]"
                >
                  Посмотреть проекты
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/contractor/company"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 font-semibold text-foreground transition hover:border-primary/25 hover:bg-secondary/50"
                >
                  Настроить профиль
                </Link>
              </div>
            </div>

            <VerificationStatus status={status} />
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3" aria-label="Текущая активность подрядчика">
          <ActivityCard
            title="Новые проекты"
            value={projectsCount}
            hint="доступно сейчас"
            href="/contractor/projects"
            linkText="Открыть подборку"
            icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />}
          />
          <ActivityCard
            title="Мои предложения"
            value={bidsCount}
            hint="отправлено"
            href="/contractor/bids"
            linkText="Открыть предложения"
            icon={<BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />}
          />
          <ActivityCard
            title="Мои объекты"
            value={activeObjects.length}
            hint="активных объектов"
            href="/contractor/work"
            linkText="Перейти к объектам"
            icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="ui-v2-panel p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Wrench className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-primary">Профиль компании</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] text-foreground">
                  {company?.public_name || "Настройте профиль подрядчика"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Реквизиты, специализации, города работы и доступность для новых заказов влияют на подбор проектов и доверие заказчиков.
                </p>
              </div>

              {company ? (
                <div className="shrink-0 rounded-2xl border border-border bg-background/70 px-4 py-3 text-left sm:text-right">
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Star className="h-4 w-4 text-[#d68a14]" aria-hidden="true" />
                    <span className="text-lg font-black text-foreground">{formatRating(company.rating)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{company.rating_count} оценок</p>
                </div>
              ) : null}
            </div>

            {company ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ProfileMetric label="Завершено проектов" value={company.completed_projects_count} />
                <ProfileMetric label="Специализаций" value={company.contractor_services.length} />
                <ProfileMetric label="Городов работы" value={company.contractor_service_areas.length} />
                <ProfileMetric
                  label="Новые заказы"
                  value={company.accepts_new_projects ? "Принимает" : "Пауза"}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
                Создайте профиль компании, чтобы настроить специализации и географию работы.
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contractor/company"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-[#076c47]"
              >
                {company ? "Редактировать профиль" : "Создать профиль"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {company ? (
                <Link
                  href="/contractor/company/trust"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 font-semibold text-foreground transition hover:border-primary/25 hover:bg-secondary/50"
                >
                  Центр доверия
                </Link>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Статус профиля</p>
                  <h2 className="mt-1 text-lg font-bold text-foreground">Верификация</h2>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <div className="mt-5">
                <StatusLine status={status} />
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl bg-muted px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs leading-5 text-muted-foreground">
                  {company?.accepts_new_projects
                    ? "Компания принимает новые проекты."
                    : "Приём новых проектов сейчас выключен или профиль ещё не готов."}
                </p>
              </div>
            </div>

            {recentObjects.length > 0 ? (
              <div className="ui-v2-panel p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-foreground">Активные объекты</h2>
                  <Link href="/contractor/work" className="text-xs font-semibold text-primary">
                    Все
                  </Link>
                </div>
                <div className="mt-3 divide-y divide-border">
                  {recentObjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/contractor/work/${project.id}`}
                      className="block py-3 transition hover:text-primary"
                    >
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">{project.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {project.city || "Город не указан"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="ui-v2-panel p-5 sm:p-6">
              <h2 className="text-lg font-bold text-foreground">Инструменты роста</h2>
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
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function ActivityCard({
  title,
  value,
  hint,
  href,
  linkText,
  icon,
}: {
  title: string;
  value: number;
  hint: string;
  href: string;
  linkText: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="ui-v2-panel group p-5 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-card)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
          {icon}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      </div>
      <p className="mt-5 text-sm font-semibold text-muted-foreground">{title}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-4xl font-black tracking-[-0.04em] text-foreground">{value}</p>
        <p className="pb-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <p className="mt-4 text-sm font-semibold text-primary">{linkText}</p>
    </Link>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background/65 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black text-foreground">{value}</p>
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

function VerificationStatus({ status }: { status: string }) {
  const config = getStatusConfig(status);

  return (
    <div className={["flex w-full items-center gap-3 rounded-2xl border px-4 py-4 sm:w-auto sm:min-w-[250px]", config.className].join(" ")}>
      <span className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", config.iconClassName].join(" ")}>
        <BadgeCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium opacity-70">Статус профиля</span>
        <span className="mt-0.5 block break-words text-sm font-bold">{config.label}</span>
      </span>
    </div>
  );
}

function StatusLine({ status }: { status: string }) {
  const config = getStatusConfig(status);

  return (
    <div className="flex items-center gap-3">
      <span className={["flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", config.iconClassName].join(" ")}>
        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{config.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Текущий статус проверки компании</p>
      </div>
    </div>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case "draft":
      return {
        label: "Черновик",
        className: "border-border bg-secondary/60 text-foreground",
        iconClassName: "bg-primary/10 text-primary",
      };
    case "pending":
      return {
        label: "Ожидает проверки",
        className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
        iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      };
    case "verified":
      return {
        label: "Подтверждён",
        className: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
        iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      };
    case "rejected":
      return {
        label: "Требует исправлений",
        className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200",
        iconClassName: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
      };
    case "suspended":
      return {
        label: "Приостановлен",
        className: "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200",
        iconClassName: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
      };
    default:
      return {
        label: "Не заполнен",
        className: "border-border bg-muted text-muted-foreground",
        iconClassName: "bg-secondary text-primary",
      };
  }
}

function formatRating(value: number | string) {
  const rating = Number(value);
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "—";
}

function pluralizeProject(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;

  if (mod100 >= 11 && mod100 <= 14) {
    return "проектов";
  }
  if (mod10 === 1) {
    return "проект";
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return "проекта";
  }
  return "проектов";
}
