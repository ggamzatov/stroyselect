import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  MapPin,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getMyProject } from "@/features/projects/queries/get-my-project";
import {
  getProjectContractorMatches,
  type ProjectContractorMatch,
} from "@/features/projects/queries/get-project-contractor-matches";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerProjectMatchesPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const [project, matches] = await Promise.all([
    getMyProject(id),
    getProjectContractorMatches(id, 8),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link
          href={`/customer/projects/${project.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться к проекту
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-4 w-4" />
              StroySelect Matching
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
              Подходящие подрядчики
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              Мы сравнили специализацию, географию, бюджет, рейтинг и историю работ подрядчиков с параметрами проекта «{project.title}».
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
                <MapPin className="h-4 w-4 text-primary" />
                {project.city || "Город не указан"}
              </span>

              <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
                <Banknote className="h-4 w-4 text-primary" />
                {formatBudget(project.budget_min, project.budget_max)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
                <UsersRound className="h-4 w-4 text-primary" />
                Найдено: {matches.length}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-foreground">
                Как формируется совпадение
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                В подбор попадают только проверенные компании, которые принимают новые проекты и работают по нужной категории. Дополнительные баллы дают совпадение города или региона, совместимый бюджет, основная специализация, рейтинг и StroySelect Score.
              </p>
            </div>
          </div>
        </section>

        {matches.length === 0 ? (
          <section className="mt-6 rounded-[1.75rem] border border-dashed border-border bg-card p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <UsersRound className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">
              Пока нет точных совпадений
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Попробуйте уточнить категорию, город или бюджет проекта. После появления новых проверенных подрядчиков подбор обновится автоматически.
            </p>
            {project.status === "draft" && (
              <Link
                href={`/customer/projects/${project.id}/edit`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Уточнить проект
              </Link>
            )}
          </section>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {matches.map((match, index) => (
              <MatchCard
                key={match.contractorId}
                match={match}
                position={index + 1}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function MatchCard({
  match,
  position,
}: {
  match: ProjectContractorMatch;
  position: number;
}) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="border-b border-border bg-secondary/30 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                #{position}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" />
                Проверен
              </span>
            </div>

            <h2 className="mt-3 truncate text-xl font-black text-foreground">
              {match.publicName}
            </h2>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-primary">
              {Math.round(match.matchScore)}%
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              совпадение
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(match.matchScore, 100)}%` }}
          />
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="grid grid-cols-3 gap-3">
          <Metric
            icon={<Star className="h-4 w-4" />}
            label="Рейтинг"
            value={match.ratingCount > 0 ? match.rating.toFixed(1) : "Новый"}
          />
          <Metric
            icon={<BriefcaseBusiness className="h-4 w-4" />}
            label="Проекты"
            value={String(match.completedProjectsCount)}
          />
          <Metric
            icon={<Sparkles className="h-4 w-4" />}
            label="Score"
            value={Math.round(match.recommendationScore).toString()}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {match.reasons.map((reason) => (
            <span
              key={reason}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              {reason}
            </span>
          ))}
        </div>

        {(match.minimumProjectBudget !== null || match.maximumProjectBudget !== null) && (
          <p className="mt-5 text-sm text-muted-foreground">
            Обычный бюджет компании: <strong className="text-foreground">{formatBudget(match.minimumProjectBudget, match.maximumProjectBudget)}</strong>
          </p>
        )}

        <Link
          href={`/customer/contractors/${match.contractorId}`}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#5c3b2a]"
        >
          Посмотреть профиль
        </Link>
      </div>
    </article>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/45 p-3">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-2 text-base font-black text-foreground">{value}</p>
    </div>
  );
}

function formatBudget(
  minimum: number | string | null,
  maximum: number | string | null
) {
  const min = toNumber(minimum);
  const max = toNumber(maximum);

  if (min !== null && max !== null) {
    return `${formatMoney(min)} — ${formatMoney(max)}`;
  }
  if (min !== null) {
    return `от ${formatMoney(min)}`;
  }
  if (max !== null) {
    return `до ${formatMoney(max)}`;
  }
  return "По договорённости";
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
