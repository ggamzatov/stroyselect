import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  ShieldCheck,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getMyContractorCompany } from
  "@/features/contractors/queries/get-my-contractor-company";

import { getServiceCategories } from
  "@/features/contractors/queries/get-service-categories";

import { getContractorCities } from
  "@/features/contractors/queries/get-contractor-cities";

import { getMyContractorPortfolio } from
  "@/features/contractors/portfolio/queries/get-my-contractor-portfolio";

import { ContractorCompanyForm } from
  "@/features/contractors/components/contractor-company-form";

import { PortfolioManager } from
  "@/features/contractors/portfolio/components/portfolio-manager";

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
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)]">
                <Building2 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold text-primary">
                  Профиль подрядчика
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">
                  Данные компании
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  Заполните сведения о компании, специализациях и территории работы.
                  Эти данные используются для проверки профиля, подбора подходящих
                  проектов и отображения компании заказчикам.
                </p>
              </div>
            </div>

            <VerificationStatus
              status={company?.verification_status ?? "not_created"}
            />
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <ContractorCompanyForm
            categories={categories}
            cities={cities}
            company={company}
          />
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <PortfolioManager portfolio={portfolio} />
        </section>
      </div>
    </main>
  );
}

function VerificationStatus({ status }: { status: string }) {
  const config = getVerificationConfig(status);

  return (
    <div
      className={[
        "inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
        config.className,
      ].join(" ")}
    >
      <ShieldCheck className="h-4 w-4" />
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
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
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
