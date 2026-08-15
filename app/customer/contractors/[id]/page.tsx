import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  MapPin,
  Phone,
  Star,
  UsersRound,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getPublicContractorCompany } from
  "@/features/contractors/queries/get-public-contractor-company";

import { getContractorReviews } from
  "@/features/reviews/queries/get-contractor-reviews";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerContractorPage({
  params,
}: Props) {
  const {
    profile,
  } =
    await getCurrentProfile();

  if (
    profile.role !==
    "customer"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    id,
  } =
    await params;

  const [
    company,
    reviews,
  ] =
    await Promise.all([
      getPublicContractorCompany(
        id
      ),

      getContractorReviews(
        id
      ),
    ]);

  const services =
    company
      .contractor_services ??
    [];

  const areas =
    company
      .contractor_service_areas ??
    [];

  const portfolio =
    company
      .contractor_portfolio_projects ??
    [];

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link
          href="/customer/contractors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться к подрядчикам
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Building2 className="h-7 w-7" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
                      {company.public_name}
                    </h1>

                    {company.verification_status ===
                      "verified" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <BadgeCheck className="h-4 w-4" />
                        Проверен
                      </span>
                    )}
                  </div>

                  {company.company_type && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatCompanyType(
                        company.company_type
                      )}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <div className="inline-flex items-center gap-2">
                      <Star className="h-4 w-4 fill-current text-amber-500" />

                      <strong>
                        {Number(
                          company.rating ??
                          0
                        ).toFixed(1)}
                      </strong>

                      <span className="text-muted-foreground">
                        {company.rating_count ??
                          0}{" "}
                        отзывов
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <BriefcaseBusiness className="h-4 w-4" />

                      {company.completed_projects_count ??
                        0}{" "}
                      проектов
                    </div>

                    {company.employee_count && (
                      <div className="inline-flex items-center gap-2 text-muted-foreground">
                        <UsersRound className="h-4 w-4" />
                        {company.employee_count} чел.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {company.description && (
              <p className="mt-6 max-w-4xl text-sm leading-7 text-muted-foreground md:text-base">
                {company.description}
              </p>
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <SectionCard
              title="Специализации"
            >
              {services.length >
              0 ? (
                <div className="flex flex-wrap gap-2">
                  {services.map(
                    (service) => {
                      const category =
                        service
                          .service_categories;

                      if (!category) {
                        return null;
                      }

                      return (
                        <span
                          key={
                            service.category_id
                          }
                          className="rounded-full border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground"
                        >
                          {category.name}
                        </span>
                      );
                    }
                  )}
                </div>
              ) : (
                <EmptyText>
                  Специализации пока не указаны.
                </EmptyText>
              )}
            </SectionCard>

            <SectionCard
              title={`Портфолио (${portfolio.length})`}
            >
              {portfolio.length >
              0 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {portfolio.map(
                    (project) => {
                      const files =
                        project
                          .contractor_portfolio_files ??
                        [];

                      const cover =
                        files.find(
                          (file) =>
                            Boolean(
                              file.signed_url
                            )
                        ) ??
                        null;

                      return (
                        <article
                          key={
                            project.id
                          }
                          className="overflow-hidden rounded-2xl border border-border bg-background"
                        >
                          {cover?.signed_url ? (
                            <img
                              src={
                                cover.signed_url
                              }
                              alt={
                                project.title
                              }
                              className="aspect-[16/10] w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-[16/10] items-center justify-center bg-secondary text-muted-foreground">
                              <BriefcaseBusiness className="h-8 w-8" />
                            </div>
                          )}

                          <div className="p-5">
                            <h3 className="font-bold text-foreground">
                              {project.title}
                            </h3>

                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {project.city && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {project.city}
                                </span>
                              )}

                              {project.completed_year && (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {project.completed_year}
                                </span>
                              )}
                            </div>

                            {project.description && (
                              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              ) : (
                <EmptyText>
                  В портфолио пока нет проектов.
                </EmptyText>
              )}
            </SectionCard>

            <SectionCard
              title={`Отзывы (${reviews.total})`}
            >
              {reviews.total >
              0 ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <RatingStat
                      label="Общий"
                      value={
                        reviews.averageRating
                      }
                    />

                    <RatingStat
                      label="Качество"
                      value={
                        reviews.averageQuality
                      }
                    />

                    <RatingStat
                      label="Сроки"
                      value={
                        reviews.averageDeadline
                      }
                    />

                    <RatingStat
                      label="Общение"
                      value={
                        reviews.averageCommunication
                      }
                    />
                  </div>

                  <div className="mt-6 space-y-4">
                    {reviews.reviews.map(
                      (review) => (
                        <article
                          key={
                            review.id
                          }
                          className="rounded-2xl border border-border bg-background p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-foreground">
                                {getReviewerName(
                                  review.profiles
                                )}
                              </p>

                              {review.projects && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {
                                    review
                                      .projects
                                      .title
                                  }
                                </p>
                              )}
                            </div>

                            <div className="inline-flex items-center gap-1 font-bold">
                              <Star className="h-4 w-4 fill-current text-amber-500" />
                              {review.rating}
                            </div>
                          </div>

                          {review.comment && (
                            <p className="mt-4 text-sm leading-6 text-muted-foreground">
                              {review.comment}
                            </p>
                          )}
                        </article>
                      )
                    )}
                  </div>
                </>
              ) : (
                <EmptyText>
                  У подрядчика пока нет отзывов.
                </EmptyText>
              )}
            </SectionCard>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <SectionCard
              title="Данные компании"
            >
              <div className="space-y-4">
                {company.founded_year && (
                  <InfoRow
                    label="Год основания"
                    value={String(
                      company.founded_year
                    )}
                  />
                )}

                {company.inn && (
                  <InfoRow
                    label="ИНН"
                    value={
                      company.inn
                    }
                  />
                )}

                {company.ogrn && (
                  <InfoRow
                    label="ОГРН"
                    value={
                      company.ogrn
                    }
                  />
                )}

                {company.contact_phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Телефон
                    </p>

                    <a
                      href={`tel:${company.contact_phone}`}
                      className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      <Phone className="h-4 w-4" />
                      {company.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="География"
            >
              {areas.length >
              0 ? (
                <div className="space-y-3">
                  {areas.map(
                    (
                      area,
                      index
                    ) => (
                      <div
                        key={`${area.city}-${index}`}
                        className="rounded-xl bg-secondary/50 p-3"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          {area.city}
                        </div>

                        {area.region && (
                          <p className="mt-1 pl-6 text-xs text-muted-foreground">
                            {area.region}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <EmptyText>
                  География не указана.
                </EmptyText>
              )}
            </SectionCard>

            <SectionCard
              title="Бюджет проектов"
            >
              <p className="text-lg font-black text-foreground">
                {formatBudget(
                  company.minimum_project_budget,
                  company.maximum_project_budget
                )}
              </p>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6">
      <h2 className="text-lg font-black text-foreground">
        {title}
      </h2>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function RatingStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-1">
        <Star className="h-4 w-4 fill-current text-amber-500" />

        <span className="font-black text-foreground">
          {Number(
            value
          ).toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function EmptyText({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function getReviewerName(
  profile:
    | {
        first_name?:
          string | null;
        last_name?:
          string | null;
      }
    | null
    | undefined
) {
  if (!profile) {
    return "Заказчик";
  }

  const name = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    "Заказчик"
  );
}

function formatBudget(
  minimum:
    unknown,
  maximum:
    unknown
) {
  const min =
    toNumber(
      minimum
    );

  const max =
    toNumber(
      maximum
    );

  if (
    min !== null &&
    max !== null
  ) {
    return `${formatMoney(
      min
    )} — ${formatMoney(
      max
    )}`;
  }

  if (
    min !== null
  ) {
    return `от ${formatMoney(
      min
    )}`;
  }

  if (
    max !== null
  ) {
    return `до ${formatMoney(
      max
    )}`;
  }

  return "По договорённости";
}

function formatMoney(
  value: number
) {
  return `${new Intl.NumberFormat(
    "ru-RU"
  ).format(
    value
  )} ₽`;
}

function toNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function formatCompanyType(
  value: string
) {
  switch (value) {
    case "legal_entity":
      return "Юридическое лицо";

    case "entrepreneur":
      return "ИП";

    case "self_employed":
      return "Самозанятый";

    default:
      return value;
  }
}
