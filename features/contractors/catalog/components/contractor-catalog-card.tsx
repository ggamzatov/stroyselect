import Link from "next/link";

import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  MapPin,
  Star,
  UsersRound,
} from "lucide-react";

import type {
  ContractorCatalogItem,
} from
  "@/features/contractors/catalog/types/contractor-catalog";

type Props = {
  contractor:
    ContractorCatalogItem;
};

export function ContractorCatalogCard({
  contractor,
}: Props) {
  const primaryArea =
    contractor.areas.find(
      (area) =>
        area.is_primary
    ) ??
    contractor.areas[0] ??
    null;

  const visibleServices =
    contractor.services.slice(
      0,
      3
    );

  return (
    <article className="group flex h-full flex-col rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-secondary text-primary">
          <Building2 className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-xl font-black tracking-tight text-foreground">
                {
                  contractor.public_name
                }
              </h2>

              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {formatCompanyType(
                  contractor.company_type
                )}
              </p>
            </div>

            {contractor.verification_status ===
              "verified" && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" />

                Проверен
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

              {contractor.rating_count >
              0 ? (
                <>
                  <span className="font-bold text-foreground">
                    {contractor.rating.toFixed(
                      1
                    )}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    ·{" "}
                    {
                      contractor.rating_count
                    }{" "}
                    {formatReviewCount(
                      contractor.rating_count
                    )}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Нет отзывов
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BriefcaseBusiness className="h-4 w-4 text-primary" />

              {
                contractor.completed_projects_count
              }{" "}
              {formatProjectCount(
                contractor.completed_projects_count
              )}
            </div>
          </div>
        </div>
      </div>

      {contractor.description && (
        <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {
            contractor.description
          }
        </p>
      )}

      {visibleServices.length >
        0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {visibleServices.map(
            (service) => (
              <span
                key={
                  service.id
                }
                className="rounded-full border border-border bg-secondary/55 px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                {
                  service.name
                }
              </span>
            )
          )}

          {contractor.services.length >
            visibleServices.length && (
            <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              +
              {contractor
                .services
                .length -
                visibleServices.length}
            </span>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoMiniCard
          icon={
            <MapPin className="h-4 w-4" />
          }
          label="География"
          value={
            primaryArea?.city ??
            "Не указана"
          }
        />

        <InfoMiniCard
          icon={
            <UsersRound className="h-4 w-4" />
          }
          label="Команда"
          value={
            contractor.employee_count
              ? `${contractor.employee_count} чел.`
              : "Не указано"
          }
        />
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-border bg-background/60 p-4">
        <p className="text-xs text-muted-foreground">
          Бюджет проектов
        </p>

        <p className="mt-2 font-bold text-foreground">
          {formatBudgetRange(
            contractor.minimum_project_budget,
            contractor.maximum_project_budget
          )}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div>
          {contractor.accepts_new_projects ? (
            <p className="text-xs font-semibold text-emerald-600">
              Принимает новые проекты
            </p>
          ) : (
            <p className="text-xs font-semibold text-muted-foreground">
              Новые проекты временно
              не принимает
            </p>
          )}

          {contractor.portfolio_count >
            0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {
                contractor.portfolio_count
              }{" "}
              {formatPortfolioCount(
                contractor.portfolio_count
              )}{" "}
              в портфолио
            </p>
          )}
        </div>

        <Link
          href={`/customer/contractors/${contractor.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition group-hover:opacity-90"
        >
          Открыть профиль
        </Link>
      </div>
    </article>
  );
}

function InfoMiniCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}

        <span className="text-[11px] font-semibold text-muted-foreground">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function formatCompanyType(
  value:
    | string
    | null
) {
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
      return (
        value ??
        "Тип не указан"
      );
  }
}

function formatBudgetRange(
  minimum:
    | number
    | null,
  maximum:
    | number
    | null
) {
  if (
    minimum === null &&
    maximum === null
  ) {
    return "Не указан";
  }

  if (
    minimum !== null &&
    maximum !== null
  ) {
    return `${formatMoney(
      minimum
    )} — ${formatMoney(
      maximum
    )}`;
  }

  if (minimum !== null) {
    return `от ${formatMoney(
      minimum
    )}`;
  }

  return `до ${formatMoney(
    maximum!
  )}`;
}

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits:
        0,
    }
  ).format(value);
}

function formatReviewCount(
  count: number
) {
  return decline(
    count,
    "отзыв",
    "отзыва",
    "отзывов"
  );
}

function formatProjectCount(
  count: number
) {
  return decline(
    count,
    "проект",
    "проекта",
    "проектов"
  );
}

function formatPortfolioCount(
  count: number
) {
  return decline(
    count,
    "объект",
    "объекта",
    "объектов"
  );
}

function decline(
  count: number,
  one: string,
  few: string,
  many: string
) {
  const lastTwo =
    count % 100;

  const last =
    count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return many;
  }

  if (last === 1) {
    return one;
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return few;
  }

  return many;
}