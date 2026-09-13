import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";

import { getContractorScore } from "@/features/contractors/queries/get-contractor-score";
import { getPublicContractorCompany } from "@/features/contractors/queries/get-public-contractor-company";
import { getContractorReviews } from "@/features/reviews/queries/get-contractor-reviews";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

type Props = { params: Promise<{ id: string }> };

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
  const rating = Number(company.rating ?? 0);
  const ratingCount = company.rating_count ?? 0;
  const completedProjects = company.completed_projects_count ?? 0;

  return (
    <main className="px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-[1200px]">
        <Link
          href="/customer/contractors"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          К специалистам
        </Link>

        <section className="relative mt-3 overflow-hidden rounded-[28px] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_8%,rgba(116,194,31,0.14),transparent_30%),radial-gradient(circle_at_62%_100%,rgba(13,59,46,0.08),transparent_35%)]" />
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4 sm:gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary text-primary sm:h-20 sm:w-20">
                  <Building2 className="h-8 w-8" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-black tracking-[-0.04em] text-foreground sm:text-3xl lg:text-4xl">
                      {company.public_name}
                    </h1>
                    {company.verification_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-black text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Проверен
                      </span>
                    ) : null}
                  </div>

                  {company.company_type ? (
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{formatCompanyType(company.company_type)}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                      {rating.toFixed(1)}
                      <span className="font-medium text-muted-foreground">({ratingCount} отзывов)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <BriefcaseBusiness className="h-4 w-4 text-primary" aria-hidden="true" />
                      {completedProjects} завершённых проектов
                    </span>
                    {areas[0]?.city ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                        {areas[0].city}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {score ? (
                <div className="shrink-0 rounded-2xl border border-primary/15 bg-secondary/70 p-4 sm:min-w-[210px]">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">StroySelect Score</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-[-0.05em] text-foreground">{score.score}</span>
                    <span className="text-xs text-muted-foreground">из 100</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-foreground">{score.label}</p>
                </div>
              ) : null}
            </div>

            {company.description ? (
              <p className="relative mt-5 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {company.description}
              </p>
            ) : null}

            <div className="relative mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Link
                href={`/customer/projects/new?contractor=${encodeURIComponent(id)}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(8,122,80,0.18)] transition hover:-translate-y-0.5"
              >
                Обсудить задачу
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {company.contact_phone ? (
                <a
                  href={`tel:${company.contact_phone}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground transition hover:border-primary/25 hover:text-primary"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Позвонить
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Главные показатели подрядчика">
          <TrustStat icon={<ShieldCheck className="h-5 w-5" />} title="Статус" value={company.verification_status === "verified" ? "Профиль проверен" : "Проверка не завершена"} tone="green" />
          <TrustStat icon={<Star className="h-5 w-5 fill-amber-400 text-amber-400" />} title="Рейтинг" value={ratingCount > 0 ? `${rating.toFixed(1)} · ${ratingCount} отзывов` : "Пока нет отзывов"} />
          <TrustStat icon={<BriefcaseBusiness className="h-5 w-5" />} title="Опыт" value={`${completedProjects} завершённых проектов`} />
          <TrustStat icon={<UsersRound className="h-5 w-5" />} title="Команда" value={company.employee_count ? `${company.employee_count} специалистов` : "Не указано"} />
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {score ? (
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="score-title">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary">Почему можно доверять</p>
                    <h2 id="score-title" className="mt-1 text-xl font-black tracking-[-0.03em]">Из чего складывается оценка</h2>
                  </div>
                  <Sparkles className="hidden h-5 w-5 text-primary sm:block" aria-hidden="true" />
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Score основан на данных платформы и помогает быстро понять сильные стороны профиля, не заставляя вас изучать десятки полей.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {score.factors.map((factor) => (
                    <div key={factor.key} className="rounded-xl border border-border bg-background p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-foreground">{factor.label}</p>
                        <span className="text-xs font-black text-primary">{factor.points}/{factor.maxPoints}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (factor.points / factor.maxPoints) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {score.strengths.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {score.strengths.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="services-title">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary">Что умеет</p>
                  <h2 id="services-title" className="mt-1 text-xl font-black tracking-[-0.03em]">Услуги и специализации</h2>
                </div>
              </div>
              {services.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {services.map((service) => {
                    const category = service.service_categories;
                    if (!category) return null;
                    return <span key={service.category_id} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">{category.name}</span>;
                  })}
                </div>
              ) : (
                <EmptyText>Специализации пока не указаны.</EmptyText>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="portfolio-title">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary">Реальные работы</p>
                  <h2 id="portfolio-title" className="mt-1 text-xl font-black tracking-[-0.03em]">Портфолио{portfolio.length > 0 ? ` · ${portfolio.length}` : ""}</h2>
                </div>
              </div>
              {portfolio.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {portfolio.map((project) => {
                    const files = project.contractor_portfolio_files ?? [];
                    const cover = files.find((file) => Boolean(file.signed_url)) ?? null;
                    return (
                      <article key={project.id} className="overflow-hidden rounded-2xl border border-border bg-background">
                        {cover?.signed_url ? (
                          <img src={cover.signed_url} alt={project.title} className="aspect-[16/10] w-full object-cover" />
                        ) : (
                          <div className="flex aspect-[16/10] items-center justify-center bg-secondary text-primary"><BriefcaseBusiness className="h-7 w-7" aria-hidden="true" /></div>
                        )}
                        <div className="p-4">
                          <h3 className="font-black text-foreground">{project.title}</h3>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {project.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{project.city}</span> : null}
                            {project.completed_year ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{project.completed_year}</span> : null}
                          </div>
                          {project.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description}</p> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyText>В портфолио пока нет проектов.</EmptyText>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="reviews-title">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary">Мнение заказчиков</p>
                <h2 id="reviews-title" className="mt-1 text-xl font-black tracking-[-0.03em]">Отзывы{reviews.total > 0 ? ` · ${reviews.total}` : ""}</h2>
              </div>
              {reviews.total > 0 ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <RatingStat label="Общий" value={reviews.averageRating} />
                    <RatingStat label="Качество" value={reviews.averageQuality} />
                    <RatingStat label="Сроки" value={reviews.averageDeadline} />
                    <RatingStat label="Общение" value={reviews.averageCommunication} />
                  </div>
                  <div className="mt-4 space-y-3">
                    {reviews.reviews.map((review) => (
                      <article key={review.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">{getReviewerName(review.profiles)}</p>
                            {review.projects ? <p className="mt-0.5 text-xs text-muted-foreground">{review.projects.title}</p> : null}
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm font-black"><Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />{review.rating}</span>
                        </div>
                        {review.comment ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.comment}</p> : null}
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyText>У подрядчика пока нет отзывов.</EmptyText>
              )}
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border border-primary/20 bg-[linear-gradient(160deg,#f4fbf1,#ffffff)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary">Следующий шаг</p>
              <h2 className="mt-1 text-lg font-black tracking-[-0.025em]">Готовы обсудить работу?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Создайте задачу — детали останутся у вас, а подрядчика можно пригласить уже из процесса.</p>
              <Link href={`/customer/projects/new?contractor=${encodeURIComponent(id)}`} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Обсудить задачу<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>

            <InfoSection title="Где работает" eyebrow="География">
              {areas.length > 0 ? (
                <div className="space-y-2">
                  {areas.map((area, index) => (
                    <div key={`${area.city}-${index}`} className="rounded-xl bg-secondary/60 p-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground"><MapPin className="h-4 w-4 text-primary" aria-hidden="true" />{area.city}</div>
                      {area.region ? <p className="mt-1 pl-6 text-xs text-muted-foreground">{area.region}</p> : null}
                    </div>
                  ))}
                </div>
              ) : <EmptyText>География не указана.</EmptyText>}
            </InfoSection>

            <InfoSection title="О компании" eyebrow="Факты">
              <div className="divide-y divide-border">
                {company.founded_year ? <FactRow icon={<CalendarDays className="h-4 w-4" />} label="Основана" value={String(company.founded_year)} /> : null}
                {company.employee_count ? <FactRow icon={<UsersRound className="h-4 w-4" />} label="Команда" value={`${company.employee_count} чел.`} /> : null}
                {company.contact_phone ? <FactRow icon={<Phone className="h-4 w-4" />} label="Телефон" value={company.contact_phone} /> : null}
              </div>
              {company.contact_phone ? <a href={`tel:${company.contact_phone}`} className="mt-3 inline-flex text-sm font-bold text-primary">Позвонить подрядчику</a> : null}
            </InfoSection>

            <InfoSection title="Стоимость" eyebrow="Ориентир">
              <p className="text-lg font-black text-foreground">{formatBudget(company.minimum_project_budget, company.maximum_project_budget)}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Точный расчёт после обсуждения задачи</div>
            </InfoSection>

            {score && score.improvements.length > 0 ? (
              <InfoSection title="Что можно улучшить" eyebrow="Прозрачность">
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">{score.improvements.map((item) => <li key={item}>• {item}</li>)}</ul>
              </InfoSection>
            ) : null}
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 xl:hidden">
        <Link href={`/customer/projects/new?contractor=${encodeURIComponent(id)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_12px_30px_rgba(8,122,80,0.26)]">Обсудить задачу<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </main>
  );
}

function TrustStat({ icon, title, value, tone = "default" }: { icon: React.ReactNode; title: string; value: string; tone?: "default" | "green" }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><div className={tone === "green" ? "flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary" : "flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground"}>{icon}</div><p className="mt-3 text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">{title}</p><p className="mt-1 text-sm font-bold text-foreground">{value}</p></div>;
}

function InfoSection({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-5"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary">{eyebrow}</p><h2 className="mt-1 text-lg font-black tracking-[-0.025em] text-foreground">{title}</h2><div className="mt-4">{children}</div></section>;
}

function FactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><span className="text-primary">{icon}</span>{label}</span><span className="text-right text-sm font-bold text-foreground">{value}</span></div>;
}

function RatingStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-secondary/60 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">{label}</p><div className="mt-1.5 flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" /><span className="font-black text-foreground">{Number(value).toFixed(1)}</span></div></div>;
}

function EmptyText({ children }: { children: React.ReactNode }) { return <p className="text-sm text-muted-foreground">{children}</p>; }
function getReviewerName(profile: { first_name?: string | null; last_name?: string | null } | null | undefined) { if (!profile) return "Заказчик"; return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Заказчик"; }
function formatBudget(minimum: unknown, maximum: unknown) { const min = toNumber(minimum); const max = toNumber(maximum); if (min !== null && max !== null) return `${formatMoney(min)} — ${formatMoney(max)}`; if (min !== null) return `от ${formatMoney(min)}`; if (max !== null) return `до ${formatMoney(max)}`; return "По договорённости"; }
function formatMoney(value: number) { return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`; }
function toNumber(value: unknown) { if (value === null || value === undefined || value === "") return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function formatCompanyType(value: string) { switch (value) { case "legal_entity": case "company": return "Юридическое лицо"; case "entrepreneur": return "ИП"; case "self_employed": return "Самозанятый"; case "individual": return "Частная бригада"; default: return value; } }
