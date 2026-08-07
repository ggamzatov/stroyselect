import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getCustomerBids } from
  "@/features/bids/queries/get-customer-bids";

import { CustomerBidActions } from
  "@/features/bids/components/customer-bid-actions";

export default async function CustomerBidsPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const bids =
    await getCustomerBids();

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />

          Вернуться в кабинет
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_25px_rgba(107,70,50,0.20)]">
              <UsersRound className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-primary">
                Кабинет заказчика
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">
                Предложения подрядчиков
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                Сравните стоимость, сроки,
                условия и профиль каждого
                подрядчика перед выбором
                исполнителя.
              </p>
            </div>
          </div>
        </section>

        {bids.length === 0 ? (
          <EmptyBids />
        ) : (
          <section className="mt-6 space-y-5">
            {bids.map((bid) => {
              const project =
                getSingleRelation(
                  bid.projects
                );

              const company =
                getSingleRelation(
                  bid.contractor_companies
                );

              const proposalHref =
                bid.status === "accepted"
                  ? `/customer/work/${bid.project_id}`
                  : `/customer/projects/${bid.project_id}`;

              const contractorProfileHref =
                company?.id
                  ? `/customer/contractors/${company.id}`
                  : null;

              return (
                <article
                  key={bid.id}
                  className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)] transition duration-200 hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
                >
                  <div className="p-6 md:p-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-primary">
                            {project?.title ??
                              "Проект"}
                          </p>

                          <BidStatusBadge
                            status={
                              bid.status
                            }
                          />
                        </div>

                        <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                          {company?.public_name ??
                            "Подрядчик"}
                        </h2>

                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />

                          <span>
                            {project?.city ??
                              "Город не указан"}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {contractorProfileHref && (
                            <Link
                              href={
                                contractorProfileHref
                              }
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background/60 px-4 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-secondary"
                            >
                              <UserRoundSearch className="h-4 w-4" />

                              Профиль подрядчика

                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          )}

                          <Link
                            href={
                              proposalHref
                            }
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#5c3b2a]"
                          >
                            {bid.status ===
                            "accepted"
                              ? "Рабочее пространство"
                              : "Открыть проект"}

                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>

                      <Link
                        href={
                          proposalHref
                        }
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary transition hover:bg-primary hover:text-primary-foreground"
                        aria-label={
                          bid.status ===
                          "accepted"
                            ? "Открыть рабочее пространство"
                            : "Открыть проект"
                        }
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <ProposalInfo
                        icon={
                          <Banknote className="h-4 w-4" />
                        }
                        label="Стоимость"
                        value={formatMoney(
                          bid.price
                        )}
                        emphasized
                      />

                      <ProposalInfo
                        icon={
                          <Clock3 className="h-4 w-4" />
                        }
                        label="Срок"
                        value={`${bid.duration_days} ${formatDays(
                          bid.duration_days
                        )}`}
                      />

                      <ProposalInfo
                        icon={
                          <CalendarDays className="h-4 w-4" />
                        }
                        label="Возможное начало"
                        value={
                          formatDate(
                            bid.proposed_start_date
                          ) ??
                          "Не указано"
                        }
                      />
                    </div>

                    <div className="mt-5 rounded-[1.25rem] border border-border bg-background/60 p-4">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4 text-primary" />

                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                          Сообщение подрядчика
                        </p>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {bid.message}
                      </p>
                    </div>

                    {(company?.contact_phone ||
                      company?.contact_email) && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        {company?.contact_phone && (
                          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-sm font-medium text-foreground">
                            <Phone className="h-4 w-4 text-primary" />

                            {
                              company.contact_phone
                            }
                          </div>
                        )}

                        {company?.contact_email && (
                          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-sm font-medium text-foreground">
                            <Mail className="h-4 w-4 text-primary" />

                            <span className="break-all">
                              {
                                company.contact_email
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {![
                    "accepted",
                    "rejected",
                    "withdrawn",
                  ].includes(
                    bid.status
                  ) && (
                    <div className="border-t border-border bg-background/30 p-6 md:px-7">
                      <CustomerBidActions
                        bidId={
                          bid.id
                        }
                        currentStatus={
                          bid.status
                        }
                      />
                    </div>
                  )}

                  {bid.status ===
                    "accepted" && (
                    <div className="border-t border-border bg-emerald-50/50 px-6 py-4 dark:bg-emerald-950/10 md:px-7">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Предложение принято.
                          Подрядчик назначен
                          исполнителем проекта.
                        </p>

                        <Link
                          href={`/customer/work/${bid.project_id}`}
                          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 dark:text-emerald-300"
                        >
                          Открыть работу

                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {bid.status ===
                    "rejected" && (
                    <div className="border-t border-border bg-red-50/40 px-6 py-4 dark:bg-red-950/10 md:px-7">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Предложение отклонено.
                      </p>
                    </div>
                  )}

                  {bid.status ===
                    "withdrawn" && (
                    <div className="border-t border-border bg-muted/50 px-6 py-4 md:px-7">
                      <p className="text-sm text-muted-foreground">
                        Подрядчик отозвал
                        предложение.
                      </p>
                    </div>
                  )}
                </article>
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
          <UsersRound className="h-7 w-7" />
        </div>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
          Предложений пока нет
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Когда подрядчики откликнутся
          на опубликованные проекты,
          их предложения появятся здесь.
        </p>

        <Link
          href="/customer/projects"
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a]"
        >
          Мои проекты

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function ProposalInfo({
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
        "rounded-[1.25rem] border border-border p-4",
        emphasized
          ? "bg-secondary/60"
          : "bg-background/60",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary">
          {icon}
        </span>

        <p className="text-xs text-muted-foreground">
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

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
): T | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
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
        label: "Новое",
        className:
          "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
        dotClassName:
          "bg-blue-500",
      };

    case "viewed":
      return {
        label:
          "Просмотрено",
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
        label:
          "Принято",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName:
          "bg-emerald-500",
      };

    case "rejected":
      return {
        label:
          "Отклонено",
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        dotClassName:
          "bg-red-500",
      };

    case "withdrawn":
      return {
        label:
          "Отозвано",
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
  value:
    | number
    | string
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
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "long",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
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
    lastTwoDigits >=
      11 &&
    lastTwoDigits <=
      14
  ) {
    return "дней";
  }

  if (
    lastDigit === 1
  ) {
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