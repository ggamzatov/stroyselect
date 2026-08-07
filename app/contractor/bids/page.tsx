import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  MapPin,
  Search,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getMyBids } from
  "@/features/bids/queries/get-my-bids";

export default async function ContractorBidsPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const bids =
    await getMyBids();

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
              <BriefcaseBusiness className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-primary">
                Кабинет подрядчика
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">
                Мои предложения
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Здесь отображаются все ваши отклики
                на проекты заказчиков и их текущие статусы.
              </p>
            </div>
          </div>
        </section>

        {bids.length === 0 ? (
          <EmptyBids />
        ) : (
          <section className="mt-8 grid gap-5 xl:grid-cols-2">
            {bids.map((bid) => {
              const project =
                getProject(
                  bid.projects
                );

              const href =
                bid.status === "accepted"
                  ? `/contractor/work/${bid.project_id}`
                  : `/contractor/projects/${bid.project_id}`;

              return (
                <Link
                  key={bid.id}
                  href={href}
                  className="group block overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
                >
                  <div className="p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />

                          <span>
                            {project?.city ??
                              "Город не указан"}
                          </span>
                        </div>

                        <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                          {project?.title ??
                            "Проект"}
                        </h2>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-3">
                        <BidStatusBadge
                          status={
                            bid.status
                          }
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
                        label="Ваше предложение"
                        value={formatMoney(
                          bid.price
                        )}
                        emphasized
                      />

                      <InfoItem
                        icon={
                          <Clock3 className="h-5 w-5" />
                        }
                        label="Срок выполнения"
                        value={`${bid.duration_days} ${formatDays(
                          bid.duration_days
                        )}`}
                      />

                      <InfoItem
                        icon={
                          <CalendarDays className="h-5 w-5" />
                        }
                        label="Дата отправки"
                        value={formatDate(
                          bid.created_at
                        )}
                      />
                    </div>

                    <div className="mt-5 rounded-[1.4rem] border border-border bg-secondary/35 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Комментарий
                      </p>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground/80">
                        {bid.message}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
                      <p className="text-sm font-semibold text-primary">
                        {bid.status === "accepted"
                          ? "Открыть рабочее пространство"
                          : "Открыть проект"}
                      </p>

                      <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
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

function EmptyBids() {
  return (
    <section className="mt-8 flex min-h-[420px] items-center justify-center rounded-[2rem] border border-dashed border-border bg-card/70 px-6 text-center shadow-[var(--shadow-soft)]">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-secondary text-primary">
          <Search className="h-7 w-7" />
        </div>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
          Предложений пока нет
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Откройте доступный проект и отправьте
          заказчику стоимость, сроки и условия выполнения.
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

function getProject(
  value:
    | {
        id: string;
        title: string;
        city: string;
        status: string;
        budget_min: number | string | null;
        budget_max: number | string | null;
      }
    | Array<{
        id: string;
        title: string;
        city: string;
        status: string;
        budget_min: number | string | null;
        budget_max: number | string | null;
      }>
    | null
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
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

function BidStatusBadge({
  status,
}: {
  status: string;
}) {
  const config =
    getBidStatusConfig(
      status
    );

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

function getBidStatusConfig(
  status: string
) {
  switch (status) {
    case "submitted":
      return {
        label: "Отправлено",
        className:
          "bg-secondary text-secondary-foreground",
        dotClassName:
          "bg-primary",
      };

    case "viewed":
      return {
        label:
          "Просмотрено заказчиком",
        className:
          "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
        dotClassName:
          "bg-violet-500",
      };

    case "shortlisted":
      return {
        label:
          "В коротком списке",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        dotClassName:
          "bg-amber-500",
      };

    case "accepted":
      return {
        label: "Принято",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName:
          "bg-emerald-500",
      };

    case "rejected":
      return {
        label: "Отклонено",
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        dotClassName:
          "bg-red-500",
      };

    case "withdrawn":
      return {
        label: "Отозвано",
        className:
          "bg-muted text-muted-foreground",
        dotClassName:
          "bg-muted-foreground",
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

function formatMoney(
  value: number | string
) {
  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value)
  );
}

function formatDate(
  value: string
) {
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

function formatDays(
  value: number
) {
  const lastTwoDigits =
    value % 100;

  const lastDigit =
    value % 10;

  if (
    lastTwoDigits >= 11 &&
    lastTwoDigits <= 14
  ) {
    return "дней";
  }

  if (lastDigit === 1) {
    return "день";
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4
  ) {
    return "дня";
  }

  return "дней";
}