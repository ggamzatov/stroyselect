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
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";

import { getContractorScore } from "@/features/contractors/queries/get-contractor-score";
import { getPublicContractorCompany } from "@/features/contractors/queries/get-public-contractor-company";
import { getContractorReviews } from "@/features/reviews/queries/get-contractor-reviews";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerContractorPage({ params }: Props) {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");

  const { id } = await params;
  const [company, reviews, score] = await Promise.all([
    getPublicContractorCompany(id),
    getContractorReviews(id),
    getContractorScore(id),
  ]);

  const services = company.contractor_services ?? [];
  const areas = company.contractor_service_areas ?? [];
  const portfolio = company.contractor_portfolio_projects ?? [];

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <Link
          href="/customer/contractors"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-sm font-bold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Вернуться к подрядчикам
        </Link>

        <section className="ui-v2-panel relative mt-3 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[28%] bg-[radial-gradient(circle_at_70%_35%,rgba(170,216,190,0.48),transparent_62%)] lg:block" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-primary sm:h-16 sm:w-16">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
                    {company.public_name}
                  </h1>
                  {company.verification_status === "verified" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Проверен
                    </span>
                  ) : null}
                </div>

                {company.company_type ? (
                  <p className="mt-1 text-sm font-medium text-muted-foreground">{formatCompanyType(company.company_type)}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    <strong className="text-foreground">{Number(company.rating ?? 0).toFixed(1)}</strong>
                    <span>({company.rating_count ?? 0})</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BriefcaseBusiness className="h-4 w-4 text-primary" aria-hidden="true" />
                    {company.completed_projects_count ?? 0} проектов
                  </span>
                  {company.employee_count ? (
                    <span className="inline-flex items-center gap-1.5">
                      <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
                      {company.employee_count} чел.
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {score ? (
              <div className="min-w-[220px] rounded-xl border border-primary/15 bg-secondary/70 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[10px] font-black uppercase tracking-[0.1em]">Рейтинг СтройВыбор</span>
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-black tracking-[-0.04em] text-foreground">{score.score}</span>
                  <span className="pb-1 text-xs text-muted-foreground">из 100</span>
                </div>
                <p className="mt-1 text-xs font-bold text-foreground">{score.label}</p>
              </div>
            ) : null}
          </div>

          {company.description ? (
            <p className="relative mt-5 max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              {company.description}
            </p>
          ) : null}
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Краткая информация о подрядчике">
          <QuickStat label="Рейтинг" value={company.rating_count ? `${Number(company.rating ?? 0).toFixed(1)} · ${company.rating_count} отзывов` : "Нет отзывов"} />
          <QuickStat label="Завершено проектов" value={String(company.completed_projects_count ?? 0)} />
          <QuickStat label="Рабочий бюджет" value={formatBudget(company.minimum_project_budget, company.maximum_project_budget)} />
          <QuickStat label="География" value={areas[0]?.city ?? "Не указана"} />
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {score ? (
              <SectionCard title="Почему такой рейтинг СтройВыбор" eyebrow="Надёжность">
                <p className="text-sm leading-6 text-muted-foreground">
                  Оценка формируется из проверяемых данных платформы: статуса компании, отзывов, завершённых проектов, полноты профиля, специализаций, географии, портфолио и качества предложений.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {score.factors.map((factor) => (
                    <div key={factor.key} className="rounded-xl border border-border bg-background/70 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-foreground">{factor.label}</p>
                        <span className="text-xs font-black text-primary">{factor.points}/{factor.maxPoints}</span>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (factor.points / factor.maxPoints) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {score.strengths.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {score.strengths.map((item) => (
                      <span key={item} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </SectionCard>
            ) : null}

            <SectionCard title="Специализации" eyebrow="Услуги">
              {services.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {services.map((service) => {
                    const category = service.service_categories;
                    if (!category) return null;
                    return (
                      <span key={service.category_id} className="rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-bold text-secondary-foreground">
                        {category.name}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <EmptyText>Специализации пока не указаны.</EmptyText>
              )}
            </SectionCard>

            <SectionCard title={`Портфолио (${portfolio.length})`} eyebrow="Работы">
              {portfolio.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {portfolio.map((project) => {
                    const files = project.contractor_portfolio_files ?? [];
                    const cover = files.find((file) => Boolean(file.signed_url)) ?? null;
                    return (
                      <article key={project.id} className="overflow-hidden rounded-xl border border-border bg-background/70">
                        {cover?.signed_url ? (
                          <img src={cover.signed_url} alt={project.title} className="aspect-[16/9] w-full object-cover" />
                        ) : (
                          <div className="flex aspect-[16/9] items-center justify-center bg-secondary text-primary">
                            <BriefcaseBusiness className="h-7 w-7" aria-hidden="true" />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-black text-foreground">{project.title}</h3>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {project.city ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                {project.city}
                              </span>
                            ) : null}
                            {project.completed_year ? (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                                {project.completed_year}
                              </span>
                            ) : null}
                          </div>
                          {project.description ? (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyText>В портфолио пока нет проектов.</EmptyText>
              )}
            </SectionCard>

            <SectionCard title={`Отзывы (${reviews.total})`} eyebrow="Оценки заказчиков">
              {reviews.total > 0 ? (
                <>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                    <RatingStat label="Общий" value={reviews.averageRating} />
                    <RatingStat label="Качество" value={reviews.averageQuality} />
                    <RatingStat label="Сроки" value={reviews.averageDeadline} />
                    <RatingStat label="Общение" value={reviews.averageCommunication} />
                  </div>

                  <div className="mt-4 space-y-3">
                    {reviews.reviews.map((review) => (
                      <article key={review.id} className="rounded-xl border border-border bg-background/70 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">{getReviewerName(review.profiles)}</p>
                            {review.projects ? <p className="mt-0.5 text-xs text-muted-foreground">{review.projects.title}</p> : null}
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm font-black">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                            {review.rating}
                          </span>
                        </div>
                        {review.comment ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.comment}</p> : null}
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyText>У подрядчика пока нет отзывов.</EmptyText>
              )}
            </SectionCard>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <SectionCard title="Данные компании" eyebrow="Контакты">
              <div className="divide-y divide-border">
                {company.founded_year ? <InfoRow label="Год основания" value={String(company.founded_year)} /> : null}
                {company.inn ? <InfoRow label="ИНН" value={company.inn} /> : null}
                {company.ogrn ? <InfoRow label="ОГРН" value={company.ogrn} /> : null}
                {company.contact_phone ? (
                  <div className="py-3 first:pt-0 last:pb-0">
                    <p className="text-xs text-muted-foreground">Телефон</p>
                    <a
                      href={`tel:${company.contact_phone}`}
                      className="mt-1 inline-flex min-h-9 items-center gap-2 text-sm font-bold text-primary"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {company.contact_phone}
                    </a>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="География" eyebrow="Где работают">
              {areas.length > 0 ? (
                <div className="space-y-2">
                  {areas.map((area, index) => (
                    <div key={`${area.city}-${index}`} className="rounded-xl bg-secondary/55 p-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                        {area.city}
                      </div>
                      {area.region ? <p className="mt-1 pl-6 text-xs text-muted-foreground">{area.region}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText>География не указана.</EmptyText>
              )}
            </SectionCard>

            <SectionCard title="Бюджет проектов" eyebrow="Диапазон">
              <p className="text-lg font-black text-foreground">
                {formatBudget(company.minimum_project_budget, company.maximum_project_budget)}
              </p>
            </SectionCard>

            {score && score.improvements.length > 0 ? (
              <SectionCard title="Что можно усилить" eyebrow="Прозрачность">
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {score.improvements.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </SectionCard>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-v2-panel min-w-0 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 truncate text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ui-v2-panel p-5 sm:p-6">
      {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">{eyebrow}</p> : null}
      <h2 className="mt-0.5 text-lg font-black tracking-tight text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="max-w-[65%] text-right text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function RatingStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center gap-1">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
        <span className="font-black text-foreground">{Number(value).toFixed(1)}</span>
      </div>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function getReviewerName(profile: { first_name?: string | null; last_name?: string | null } | null | undefined) {
  if (!profile) return "Заказчик";
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Заказчик";
}

function formatBudget(minimum: unknown, maximum: unknown) {
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

function formatCompanyType(value: string) {
  switch (value) {
    case "legal_entity":
    case "company":
      return "Юридическое лицо";
    case "entrepreneur":
      return "ИП";
    case "self_employed":
      return "Самозанятый";
    case "individual":
      return "Частная бригада";
    default:
      return value;
  }
}
