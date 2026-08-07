import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  getContractorsForReview,
  type ContractorReviewFilter,
} from
  "@/features/admin/contractors/queries/get-contractors-for-review";

import { VerificationStatusBadge } from
  "@/features/admin/components/verification-status-badge";

type Props = {
  searchParams: Promise<{
    status?: string;
  }>;
};

const ALLOWED_FILTERS = [
  "pending",
  "verified",
  "rejected",
  "suspended",
  "all",
] as const;

export default async function AdminContractorsPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  const requestedStatus =
    params.status ??
    "pending";

  const filter =
    ALLOWED_FILTERS.includes(
      requestedStatus as
        (typeof ALLOWED_FILTERS)[number]
    )
      ? (requestedStatus as ContractorReviewFilter)
      : "pending";

  const contractors =
    await getContractorsForReview(
      filter
    );

  return (
    <div className="space-y-6">
      {/* Header */}

      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/70 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldAlert className="h-3.5 w-3.5" />

              Проверка исполнителей
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
              Подрядчики
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Проверяйте профили компаний,
              подтверждайте данные и управляйте
              доступом подрядчиков к проектам.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background/70 px-4 py-3">
            <Search className="h-4 w-4 text-primary" />

            <span className="text-sm font-semibold text-foreground">
              {contractors.length}
            </span>

            <span className="text-sm text-muted-foreground">
              в списке
            </span>
          </div>
        </div>
      </section>

      {/* Filters */}

      <section className="rounded-[1.5rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap gap-2">
          <FilterLink
            href="/admin/contractors?status=pending"
            label="Ожидают проверки"
            active={
              filter === "pending"
            }
            icon={
              <Clock3 className="h-4 w-4" />
            }
          />

          <FilterLink
            href="/admin/contractors?status=verified"
            label="Подтверждённые"
            active={
              filter === "verified"
            }
            icon={
              <ShieldCheck className="h-4 w-4" />
            }
          />

          <FilterLink
            href="/admin/contractors?status=rejected"
            label="Отклонённые"
            active={
              filter === "rejected"
            }
            icon={
              <XCircle className="h-4 w-4" />
            }
          />

          <FilterLink
            href="/admin/contractors?status=suspended"
            label="Приостановленные"
            active={
              filter === "suspended"
            }
            icon={
              <ShieldAlert className="h-4 w-4" />
            }
          />

          <FilterLink
            href="/admin/contractors?status=all"
            label="Все"
            active={
              filter === "all"
            }
            icon={
              <Building2 className="h-4 w-4" />
            }
          />
        </div>
      </section>

      {/* List */}

      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)]">
        {contractors.length ===
        0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <BadgeCheck className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-foreground">
              Подрядчиков нет
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              В выбранной категории пока
              нет профилей.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contractors.map(
              (company) => (
                <Link
                  key={
                    company.id
                  }
                  href={`/admin/contractors/${company.id}`}
                  className="group block p-5 transition hover:bg-secondary/30 md:p-6"
                >
                  <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px_170px_28px] md:items-center">
                    <div className="min-w-0">
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                          <Building2 className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                          <h2 className="truncate font-bold text-foreground">
                            {
                              company.public_name
                            }
                          </h2>

                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {company.legal_name ||
                              "Юридическое название не указано"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {company.inn && (
                              <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                                ИНН:{" "}
                                {
                                  company.inn
                                }
                              </span>
                            )}

                            {company
                              .contractor_service_areas
                              ?.slice(0, 3)
                              .map(
                                (
                                  area
                                ) => (
                                  <span
                                    key={
                                      area.city
                                    }
                                    className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary"
                                  >
                                    {
                                      area.city
                                    }
                                  </span>
                                )
                              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Обновлён
                      </p>

                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDate(
                          company.updated_at
                        )}
                      </p>
                    </div>

                    <div>
                      <VerificationStatusBadge
                        status={
                          company.verification_status
                        }
                      />
                    </div>

                    <ArrowRight className="hidden h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary md:block" />
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(107,70,50,0.16)]"
          : "border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
      ].join(" ")}
    >
      {icon}

      {label}
    </Link>
  );
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}