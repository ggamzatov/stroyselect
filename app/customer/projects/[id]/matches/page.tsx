import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Bookmark,
  CheckCircle2,
  Clock3,
  EyeOff,
  Heart,
  MailPlus,
  MapPin,
  Sparkles,
  Star,
  UsersRound,
  XCircle,
} from "lucide-react";

import { inviteContractorToProject } from "@/features/projects/actions/invite-contractor-to-project";
import {
  cancelProjectInvitation,
  setProjectInvitationShortlisted,
} from "@/features/projects/actions/manage-project-invitation";
import { setProjectMatchPreference } from "@/features/projects/actions/set-project-match-preference";
import { assessProjectIntake } from "@/features/projects/lib/assess-project-intake";
import {
  getProjectContractorMatches,
  type MatchScoreComponents,
  type ProjectContractorMatch,
} from "@/features/projects/queries/get-project-contractor-matches";
import { getMyProject } from "@/features/projects/queries/get-my-project";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerProjectMatchesPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const [project, matches] = await Promise.all([
    getMyProject(id),
    getProjectContractorMatches(id, 12),
  ]);
  const intake = assessProjectIntake(project);

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <Link
          href={`/customer/projects/${project.id}`}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-sm font-bold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Вернуться к проекту
        </Link>

        <section className="ui-v2-panel relative mt-3 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] bg-[radial-gradient(circle_at_70%_35%,rgba(170,216,190,0.48),transparent_62%)] lg:block" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Умный подбор подрядчиков
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
                Подходящие подрядчики
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                Подбор учитывает категорию, географию, бюджет, рейтинг СтройВыбор, опыт, скорость ответа, завершение проектов и историю споров.
              </p>
              <p className="mt-2 truncate text-xs font-semibold text-muted-foreground">Проект: {project.title}</p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3">
              <HeroMetric icon={<UsersRound className="h-4 w-4" />} label="Найдено" value={String(matches.length)} />
              <HeroMetric icon={<MapPin className="h-4 w-4" />} label="Город" value={project.city || "—"} />
              <HeroMetric icon={<Banknote className="h-4 w-4" />} label="Бюджет" value={formatBudget(project.budget_min, project.budget_max)} wide />
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-[1fr_320px]">
          <div className="ui-v2-panel flex items-start gap-3 p-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-black text-foreground">Почему подрядчик подходит</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
                Карточки показывают реальный match score и его факторы. Сохранённые кандидаты поднимаются выше, скрытые больше не показываются для этого проекта.
              </p>
            </div>
          </div>

          <div className="ui-v2-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Готовность заявки</p>
                <p className="mt-1 text-sm font-black text-foreground">
                  {intake.completedChecks} из {intake.totalChecks} пунктов
                </p>
              </div>
              <span className="text-2xl font-black text-primary">{intake.score}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${intake.score}%` }} />
            </div>
          </div>
        </section>

        {matches.length === 0 ? (
          <section className="ui-v2-panel mt-4 flex min-h-[300px] items-center justify-center px-6 text-center">
            <div className="max-w-lg">
              <UsersRound className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-black">Пока нет точных совпадений</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Уточните категорию, город или бюджет проекта либо верните ранее скрытых подрядчиков через менеджера.
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-4 grid gap-4 lg:grid-cols-2" aria-label="Подобранные подрядчики">
            {matches.map((match, index) => (
              <MatchCard key={match.contractorId} projectId={project.id} match={match} position={index + 1} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function MatchCard({
  projectId,
  match,
  position,
}: {
  projectId: string;
  match: ProjectContractorMatch;
  position: number;
}) {
  return (
    <article
      className={[
        "ui-v2-panel flex min-w-0 flex-col overflow-hidden",
        match.isShortlisted || match.isSaved ? "border-primary/35 ring-2 ring-primary/10" : "",
      ].join(" ")}
    >
      <div className="border-b border-border bg-secondary/25 p-5 sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-primary-foreground">#{position}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Проверен
              </span>
              {match.isSaved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                  <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                  Сохранён
                </span>
              ) : null}
              {match.isShortlisted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary">
                  <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                  Короткий список
                </span>
              ) : null}
              {match.invitationStatus ? <InvitationBadge status={match.invitationStatus} /> : null}
            </div>

            <h2 className="mt-3 truncate text-xl font-black tracking-[-0.02em] text-foreground">{match.publicName}</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{formatCompanyType(match.companyType)}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-3xl font-black tracking-[-0.04em] text-primary">{Math.round(match.matchScore)}%</p>
            <p className="text-[10px] font-semibold text-muted-foreground">совпадение</p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-card">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(match.matchScore, 100)}%` }} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-2">
          <Metric
            icon={<Star className="h-4 w-4" />}
            label="Рейтинг"
            value={match.ratingCount > 0 ? match.rating.toFixed(1) : "Новый"}
          />
          <Metric
            icon={<Clock3 className="h-4 w-4" />}
            label="Ответы"
            value={`${Math.round(match.responseRate)}%`}
          />
          <Metric
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Завершение"
            value={`${Math.round(match.completionRate)}%`}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {match.reasons.slice(0, 5).map((reason) => (
            <span key={reason} className="rounded-full bg-secondary/65 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
              {reason}
            </span>
          ))}
        </div>

        <details className="mt-4 rounded-xl border border-border bg-background/70 p-3.5">
          <summary className="cursor-pointer text-xs font-black text-primary">Факторы рейтинга совпадения</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(match.scoreComponents).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-secondary/45 px-3 py-2 text-xs">
                <span className="text-muted-foreground">{componentLabel(key as keyof MatchScoreComponents)}</span>
                <strong>+{value}</strong>
              </div>
            ))}
          </div>
        </details>

        {(match.minimumProjectBudget !== null || match.maximumProjectBudget !== null) ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Обычный бюджет: <strong className="text-foreground">{formatBudget(match.minimumProjectBudget, match.maximumProjectBudget)}</strong>
          </p>
        ) : null}

        <div className="mt-auto pt-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <Link
              href={`/customer/contractors/${match.contractorId}`}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-bold text-primary hover:bg-secondary"
            >
              Профиль
            </Link>

            <form action={setProjectMatchPreference}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="contractorId" value={match.contractorId} />
              <input type="hidden" name="preference" value={match.isSaved ? "neutral" : "saved"} />
              <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-secondary px-3 text-sm font-bold text-primary">
                <Heart className="h-4 w-4" aria-hidden="true" />
                {match.isSaved ? "Не сохранять" : "Сохранить"}
              </button>
            </form>

            <form action={setProjectMatchPreference}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="contractorId" value={match.contractorId} />
              <input type="hidden" name="preference" value="dismissed" />
              <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold text-muted-foreground">
                <EyeOff className="h-4 w-4" aria-hidden="true" />
                Не показывать
              </button>
            </form>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <form action={setProjectInvitationShortlisted}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="contractorId" value={match.contractorId} />
              <input type="hidden" name="shortlisted" value={String(!match.isShortlisted)} />
              <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-secondary px-4 text-sm font-bold text-primary">
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                {match.isShortlisted ? "Убрать из короткого списка" : "В короткий список"}
              </button>
            </form>

            {!match.isInvited || match.invitationStatus === "cancelled" ? (
              <form action={inviteContractorToProject}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="contractorId" value={match.contractorId} />
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)] hover:bg-[#076c47]"
                >
                  <MailPlus className="h-4 w-4" aria-hidden="true" />
                  Пригласить к проекту
                </button>
              </form>
            ) : match.invitationStatus === "invited" || match.invitationStatus === "viewed" ? (
              <form action={cancelProjectInvitation}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="contractorId" value={match.contractorId} />
                <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-muted-foreground">
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Отменить приглашение
                </button>
              </form>
            ) : (
              <div className="flex min-h-11 items-center justify-center rounded-xl bg-secondary/55 px-4 text-center text-sm font-bold">
                {match.invitationStatus === "accepted" ? "Подрядчик принял приглашение" : "Подрядчик отказался"}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={["rounded-xl border border-border bg-card/85 px-3 py-2.5 backdrop-blur", wide ? "col-span-2 sm:col-span-1" : ""].join(" ")}>
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 max-w-[180px] truncate text-xs font-black text-foreground">{value}</p>
    </div>
  );
}

function InvitationBadge({ status }: { status: string }) {
  const label =
    status === "accepted"
      ? "Принял"
      : status === "declined"
        ? "Отказался"
        : status === "viewed"
          ? "Просмотрел"
          : status === "cancelled"
            ? "Отменено"
            : "Приглашён";

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
      <MailPlus className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/45 p-3">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 text-base font-black text-foreground">{value}</p>
    </div>
  );
}

function componentLabel(key: keyof MatchScoreComponents) {
  const labels: Record<keyof MatchScoreComponents, string> = {
    category: "Категория",
    primaryService: "Основная специализация",
    geography: "География",
    budget: "Бюджет",
    relevantExperience: "Опыт в категории",
    propertyExperience: "Опыт на типе объекта",
    stroyselectScore: "Рейтинг СтройВыбор",
    rating: "Отзывы",
    response: "Ответы",
    completion: "Завершение",
    disputeFree: "Без споров",
    bidWin: "Успешность предложений",
    deadline: "Соблюдение сроков",
    responseSpeed: "Скорость ответа",
  };
  return labels[key];
}

function formatCompanyType(value: string | null) {
  switch (value) {
    case "individual":
      return "Частная бригада";
    case "self_employed":
      return "Самозанятый";
    case "entrepreneur":
      return "ИП";
    case "company":
      return "Юридическое лицо";
    default:
      return "Подрядчик";
  }
}

function formatBudget(minimum: number | string | null, maximum: number | string | null) {
  const min = toNumber(minimum);
  const max = toNumber(maximum);
  if (min !== null && max !== null) return `${formatMoney(min)} — ${formatMoney(max)}`;
  if (min !== null) return `от ${formatMoney(min)}`;
  if (max !== null) return `до ${formatMoney(max)}`;
  return "По договорённости";
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
