import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  MapPin,
  Settings2,
  Star,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getMyContractorCompany } from "@/features/contractors/queries/get-my-contractor-company";
import { getServiceCategories } from "@/features/contractors/queries/get-service-categories";
import { getContractorCities } from "@/features/contractors/queries/get-contractor-cities";
import { getMyContractorPortfolio } from "@/features/contractors/portfolio/queries/get-my-contractor-portfolio";
import { ContractorCompanyForm } from "@/features/contractors/components/contractor-company-form";
import { PortfolioManager } from "@/features/contractors/portfolio/components/portfolio-manager";

export default async function ContractorCompanyPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const [company, categories, cities, portfolio] = await Promise.all([
    getMyContractorCompany(),
    getServiceCategories(),
    getContractorCities(),
    getMyContractorPortfolio(),
  ]);

  const status = company?.verification_status ?? "not_created";

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <section className="ui-v2-panel relative overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_70%_45%,rgba(170,216,190,0.58),transparent_60%)] lg:block" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                    Настройки компании
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl">
                    {company?.public_name || "Профиль подрядчика"}
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
                Управляйте юридическими данными, услугами, географией работы, контактами и портфолио. Эти сведения используются при проверке компании и подборе заказов.
              </p>
            </div>

            <VerificationStatus status={status} />
          </div>

          {company ? (
            <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProfileMetric
                icon={<Star className="h-4 w-4" aria-hidden="true" />}
                label="Рейтинг"
                value={formatRating(company.rating)}
                suffix={`${company.rating_count} оценок`}
              />
              <ProfileMetric
                icon={<BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />}
                label="Завершено проектов"
                value={String(company.completed_projects_count)}
                suffix="в истории компании"
              />
              <ProfileMetric
                icon={<Settings2 className="h-4 w-4" aria-hidden="true" />}
                label="Специализации"
                value={String(company.contractor_services.length)}
                suffix="активных направлений"
              />
              <ProfileMetric
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                label="География"
                value={String(company.contractor_service_areas.length)}
                suffix="городов работы"
              />
            </div>
          ) : null}
        </section>

        <section className="mt-5 ui-v2-panel overflow-visible p-5 sm:p-6 lg:p-7" aria-labelledby="company-form-heading">
          <div className="mb-6 flex items-start gap-3 border-b border-border pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="company-form-heading" className="text-lg font-black text-foreground sm:text-xl">
                Анкета компании
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Основные сведения, опыт, услуги, города и контакты.
              </p>
            </div>
          </div>

          <ContractorCompanyForm
            categories={categories}
            cities={cities}
            company={company}
          />
        </section>

        <section className="mt-5 ui-v2-panel p-5 sm:p-6 lg:p-7" aria-labelledby="portfolio-heading">
          <div className="mb-6 flex items-start gap-3 border-b border-border pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="portfolio-heading" className="text-lg font-black text-foreground sm:text-xl">
                Портфолио компании
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Покажите заказчикам реальные завершённые объекты и фотографии работ.
              </p>
            </div>
          </div>

          <PortfolioManager portfolio={portfolio} />
        </section>
      </div>
    </main>
  );
}

function ProfileMetric({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black tracking-[-0.035em] text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{suffix}</p>
    </div>
  );
}

function VerificationStatus({ status }: { status: string }) {
  const config = getVerificationConfig(status);

  return (
    <div
      className={[
        "inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
        config.className,
      ].join(" ")}
    >
      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
      {config.label}
    </div>
  );
}

function getVerificationConfig(status: string) {
  switch (status) {
    case "verified":
      return {
        label: "Профиль подтверждён",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
    case "pending":
      return {
        label: "На проверке",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      };
    case "rejected":
      return {
        label: "Требует исправлений",
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
      };
    case "suspended":
      return {
        label: "Приостановлен",
        className:
          "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
      };
    case "draft":
      return {
        label: "Черновик",
        className: "bg-secondary text-secondary-foreground",
      };
    default:
      return {
        label: "Профиль не создан",
        className: "bg-muted text-muted-foreground",
      };
  }
}

function formatRating(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
