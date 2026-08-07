import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  UsersRound,
  Wrench,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getPublicContractorCompany } from
  "@/features/contractors/queries/get-public-contractor-company";

import { PublicPortfolioGallery } from
  "@/features/contractors/portfolio/components/public-portfolio-gallery";

import { getContractorReviews } from
  "@/features/reviews/queries/get-contractor-reviews";

import { ContractorReviews } from
  "@/features/reviews/components/contractor-reviews";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerContractorPage({
  params,
}: Props) {
  const { id } =
    await params;

  const { profile } =
    await getCurrentProfile();

  if (
    profile.role !==
    "customer"
  ) {
    redirect("/dashboard");
  }

  const [
    company,
    reviewData,
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
    getServices(
      company.contractor_services
    );

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
        {/* Назад */}

        <Link
          href="/customer/bids"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />

          Вернуться к предложениям
        </Link>

        {/* HERO */}

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)]">
                <Building2 className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-primary">
                    Профиль подрядчика
                  </p>

                  <VerificationBadge
                    status={
                      company.verification_status
                    }
                  />
                </div>

                <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
                  {company.public_name}
                </h1>

                {company.legal_name && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {
                      company.legal_name
                    }
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {areas
                    .filter(
                      (area) =>
                        area.is_primary
                    )
                    .slice(0, 1)
                    .map(
                      (
                        area,
                        index
                      ) => (
                        <span
                          key={`${area.city}-${index}`}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-sm font-medium text-muted-foreground"
                        >
                          <MapPin className="h-4 w-4 text-primary" />

                          {area.city}
                        </span>
                      )
                    )}

                  {company.founded_year && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-sm font-medium text-muted-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" />

                      С{" "}
                      {
                        company.founded_year
                      }{" "}
                      года
                    </span>
                  )}

                  {company.employee_count && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-sm font-medium text-muted-foreground">
                      <UsersRound className="h-4 w-4 text-primary" />

                      {
                        company.employee_count
                      }{" "}
                      сотрудников
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Рейтинг */}

            <div className="w-full rounded-[1.5rem] border border-border bg-background/60 p-5 lg:w-auto lg:min-w-[190px]">
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />

                <span className="text-3xl font-black tracking-tight text-foreground">
                  {Number(
                    company.rating ??
                      reviewData.averageRating ??
                      0
                  ).toFixed(1)}
                </span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {
                  company.rating_count ??
                  reviewData.total
                }{" "}
                {formatReviewCount(
                  company.rating_count ??
                    reviewData.total
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Основной контент */}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {/* О компании */}

            <Section
              title="О компании"
              icon={
                <Building2 className="h-5 w-5" />
              }
            >
              {company.description ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {
                    company.description
                  }
                </p>
              ) : (
                <EmptyText text="Подрядчик пока не добавил описание компании." />
              )}
            </Section>

            {/* Опыт */}

            <Section
              title="Опыт и возможности"
              icon={
                <BadgeCheck className="h-5 w-5" />
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <DataCard
                  label="Год начала работы"
                  value={
                    company.founded_year
                      ? String(
                          company.founded_year
                        )
                      : "Не указан"
                  }
                />

                <DataCard
                  label="Количество сотрудников"
                  value={
                    company.employee_count
                      ? String(
                          company.employee_count
                        )
                      : "Не указано"
                  }
                />

                <DataCard
                  label="Минимальный бюджет"
                  value={formatMoney(
                    company.minimum_project_budget
                  )}
                />

                <DataCard
                  label="Максимальный бюджет"
                  value={formatMoney(
                    company.maximum_project_budget
                  )}
                />
              </div>
            </Section>

            {/* Специализации */}

            <Section
              title="Специализации"
              icon={
                <Wrench className="h-5 w-5" />
              }
            >
              {services.length ===
              0 ? (
                <EmptyText text="Специализации пока не указаны." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {services.map(
                    (
                      service
                    ) => (
                      <span
                        key={
                          service.id
                        }
                        className="rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm font-semibold text-foreground"
                      >
                        {
                          service.name
                        }
                      </span>
                    )
                  )}
                </div>
              )}
            </Section>

            {/* География */}

            <Section
              title="География работы"
              icon={
                <MapPin className="h-5 w-5" />
              }
            >
              {areas.length === 0 ? (
                <EmptyText text="Города работы пока не указаны." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {areas.map(
                    (
                      area,
                      index
                    ) => (
                      <div
                        key={`${area.city}-${index}`}
                        className="rounded-[1.25rem] border border-border bg-background/60 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />

                          <p className="font-semibold text-foreground">
                            {
                              area.city
                            }
                          </p>

                          {area.is_primary && (
                            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                              Основной
                            </span>
                          )}
                        </div>

                        {area.region && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {
                              area.region
                            }
                          </p>
                        )}

                        {area.travel_radius_km !==
                          null &&
                          area.travel_radius_km !==
                            undefined && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Радиус
                              выезда:{" "}
                              {
                                area.travel_radius_km
                              }{" "}
                              км
                            </p>
                          )}
                      </div>
                    )
                  )}
                </div>
              )}
            </Section>

            {/* Портфолио */}

            <Section
              title="Портфолио"
              icon={
                <Building2 className="h-5 w-5" />
              }
            >
              {portfolio.length ===
              0 ? (
                <EmptyText text="Подрядчик пока не добавил выполненные объекты." />
              ) : (
                <div className="space-y-6">
                  {portfolio.map(
                    (
                      project
                    ) => {
                      const files =
                        project
                          .contractor_portfolio_files ??
                        [];

                      return (
                        <article
                          key={
                            project.id
                          }
                          className="rounded-[1.5rem] border border-border bg-background/60 p-5 md:p-6"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                                Выполненный
                                объект
                              </p>

                              <h3 className="mt-2 text-xl font-bold text-foreground">
                                {
                                  project.title
                                }
                              </h3>

                              {(project.city ||
                                project.completed_year) && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {project.city ??
                                    ""}

                                  {project.city &&
                                  project.completed_year
                                    ? " · "
                                    : ""}

                                  {project.completed_year ??
                                    ""}
                                </p>
                              )}
                            </div>

                            <span className="w-fit rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
                              {
                                files.length
                              }{" "}
                              {formatPhotoCount(
                                files.length
                              )}
                            </span>
                          </div>

                          {project.description && (
                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                              {
                                project.description
                              }
                            </p>
                          )}

                          <div className="mt-5">
                            <PublicPortfolioGallery
                              files={
                                files
                              }
                            />
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </Section>

            {/* ОТЗЫВЫ */}

            <Section
              title="Отзывы заказчиков"
              icon={
                <Star className="h-5 w-5" />
              }
            >
              <ContractorReviews
                reviews={
                  reviewData.reviews
                }
                total={
                  reviewData.total
                }
                averageRating={
                  reviewData.averageRating
                }
                averageQuality={
                  reviewData.averageQuality
                }
                averageDeadline={
                  reviewData.averageDeadline
                }
                averageCommunication={
                  reviewData.averageCommunication
                }
                distribution={
                  reviewData.distribution
                }
              />
            </Section>
          </div>

          {/* Правая колонка */}

          <aside className="space-y-5 xl:sticky xl:top-24">
            {/* Данные компании */}

            <InfoCard
              title="Данные компании"
              icon={
                <BadgeCheck className="h-5 w-5" />
              }
            >
              <InfoLine
                label="Тип"
                value={formatCompanyType(
                  company.company_type
                )}
              />

              <InfoLine
                label="ИНН"
                value={
                  company.inn ??
                  "Не указан"
                }
              />

              <InfoLine
                label="ОГРН"
                value={
                  company.ogrn ??
                  "Не указан"
                }
              />
            </InfoCard>

            {/* Бюджеты */}

            <InfoCard
              title="Бюджет проектов"
              icon={
                <Banknote className="h-5 w-5" />
              }
            >
              <InfoLine
                label="Минимальный"
                value={formatMoney(
                  company.minimum_project_budget
                )}
              />

              <InfoLine
                label="Максимальный"
                value={formatMoney(
                  company.maximum_project_budget
                )}
              />
            </InfoCard>

            {/* Контакты */}

            <InfoCard
              title="Контакты"
              icon={
                <Phone className="h-5 w-5" />
              }
            >
              {company.contact_phone && (
                <ContactLine
                  icon={
                    <Phone className="h-4 w-4" />
                  }
                  value={
                    company.contact_phone
                  }
                />
              )}

              {company.contact_email && (
                <ContactLine
                  icon={
                    <Mail className="h-4 w-4" />
                  }
                  value={
                    company.contact_email
                  }
                />
              )}

              {company.website && (
                <ContactLine
                  icon={
                    <Globe2 className="h-4 w-4" />
                  }
                  value={
                    company.website
                  }
                />
              )}

              {company.telegram && (
                <ContactLine
                  icon={
                    <MessageCircle className="h-4 w-4" />
                  }
                  value={
                    company.telegram
                  }
                />
              )}

              {!company.contact_phone &&
                !company.contact_email &&
                !company.website &&
                !company.telegram && (
                  <EmptyText text="Контакты не указаны." />
                )}
            </InfoCard>

            {/* Регистрация */}

            <InfoCard
              title="На платформе"
              icon={
                <CalendarDays className="h-5 w-5" />
              }
            >
              <InfoLine
                label="С"
                value={formatDate(
                  company.created_at
                )}
              />

              <InfoLine
                label="Отзывы"
                value={`${reviewData.total} ${formatReviewCount(
                  reviewData.total
                )}`}
              />
            </InfoCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>

        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>

        <h2 className="font-bold text-foreground">
          {title}
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function DataCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="max-w-[190px] break-words text-right text-sm font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function ContactLine({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-background/60 p-3">
      <span className="mt-0.5 shrink-0 text-primary">
        {icon}
      </span>

      <span className="min-w-0 break-all text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function EmptyText({
  text,
}: {
  text: string;
}) {
  return (
    <p className="text-sm leading-6 text-muted-foreground">
      {text}
    </p>
  );
}

function VerificationBadge({
  status,
}: {
  status: string;
}) {
  if (
    status ===
    "verified"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <ShieldCheck className="h-3.5 w-3.5" />

        Проверен
      </span>
    );
  }

  return (
    <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
      {formatVerificationStatus(
        status
      )}
    </span>
  );
}

function getServices(
  value:
    | Array<{
        category_id:
          | string
          | number;

        service_categories:
          | {
              id:
                | string
                | number;

              name: string;
            }
          | Array<{
              id:
                | string
                | number;

              name: string;
            }>
          | null;
      }>
    | null
    | undefined
) {
  if (!value) {
    return [];
  }

  return value
    .map(
      (item) => {
        const category =
          Array.isArray(
            item.service_categories
          )
            ? item
                .service_categories[0]
            : item.service_categories;

        return (
          category ??
          null
        );
      }
    )
    .filter(
      (
        category
      ): category is {
        id:
          | string
          | number;

        name: string;
      } =>
        category !==
        null
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
        "Не указан"
      );
  }
}

function formatVerificationStatus(
  value: string
) {
  switch (value) {
    case "pending":
      return "На проверке";

    case "rejected":
      return "Требует исправлений";

    case "suspended":
      return "Приостановлен";

    case "draft":
      return "Черновик";

    default:
      return "Не подтверждён";
  }
}

function formatMoney(
  value:
    | number
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Не указан";
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "Не указан";
  }

  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(number);
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "Не указано";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "long",
    }
  ).format(
    new Date(value)
  );
}

function formatPhotoCount(
  count: number
) {
  const lastTwo =
    count % 100;

  const last =
    count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "фотографий";
  }

  if (last === 1) {
    return "фотография";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "фотографии";
  }

  return "фотографий";
}

function formatReviewCount(
  count: number
) {
  const lastTwo =
    count % 100;

  const last =
    count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "отзывов";
  }

  if (
    last === 1
  ) {
    return "отзыв";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "отзыва";
  }

  return "отзывов";
}