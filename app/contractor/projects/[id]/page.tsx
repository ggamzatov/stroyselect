import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  FileText,
  MapPin,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getAvailableProject } from
  "@/features/projects/queries/get-available-project";

import { BidForm } from
  "@/features/bids/components/bid-form";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContractorProjectPage({
  params,
}: Props) {
  const { id } = await params;

  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const {
    project,
    existingBid,
  } = await getAvailableProject(id);

  const categoryName =
    getCategoryName(
      project.service_categories
    );

  const propertyType =
    formatPropertyType(
      project.property_type
    );

  const budget =
    formatBudget(
      project.budget_min,
      project.budget_max
    );

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link
          href="/contractor/projects"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />

          Вернуться к проектам
        </Link>

        {/* Hero */}

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-semibold text-primary">
              {categoryName}
            </p>

            <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-[-0.035em] text-foreground md:text-5xl">
              {project.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />

                <span>
                  {project.city ||
                    "Город не указан"}
                </span>
              </div>

              {propertyType && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />

                  <span>
                    {propertyType}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Краткая информация */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            icon={
              <Banknote className="h-5 w-5" />
            }
            label="Бюджет"
            value={budget}
          />

          <SummaryCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Желаемое начало"
            value={
              formatDate(
                project.desired_start_date
              ) ?? "Не указано"
            }
          />

          <SummaryCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Желаемое окончание"
            value={
              formatDate(
                project.desired_end_date
              ) ?? "Не указано"
            }
          />
        </section>

        {/* Основной контент */}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-6">
            <InfoSection
              icon={
                <FileText className="h-5 w-5" />
              }
              title="Описание проекта"
              description="Основная информация от заказчика."
            >
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground md:text-base">
                {project.description}
              </p>
            </InfoSection>

            <InfoSection
              icon={
                <Building2 className="h-5 w-5" />
              }
              title="Объект"
              description="Информация о месте и типе объекта."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="Тип объекта"
                  value={propertyType}
                />

                <DetailCard
                  label="Регион"
                  value={project.region}
                />

                <DetailCard
                  label="Город"
                  value={project.city}
                />

                <DetailCard
                  label="Адрес"
                  value={project.address}
                />
              </div>
            </InfoSection>

            <InfoSection
              icon={
                <Banknote className="h-5 w-5" />
              }
              title="Бюджет и сроки"
              description="Ориентиры заказчика по стоимости и срокам."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="Бюджет"
                  value={budget}
                  emphasized
                />

                <DetailCard
                  label="Желаемое начало"
                  value={
                    formatDate(
                      project.desired_start_date
                    )
                  }
                />

                <DetailCard
                  label="Желаемое окончание"
                  value={
                    formatDate(
                      project.desired_end_date
                    )
                  }
                />
              </div>
            </InfoSection>
          </div>

          {/* Правая колонка */}

          <aside className="xl:sticky xl:top-24">
            <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="border-b border-border bg-secondary/35 px-6 py-5">
                <p className="text-sm font-semibold text-primary">
                  Предложение
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                  Откликнуться на проект
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Укажите стоимость,
                  срок выполнения и
                  возможную дату начала.
                </p>
              </div>

              <div className="p-5">
                <BidForm
                  projectId={
                    project.id
                  }
                  existingBid={
                    existingBid
                      ? {
                          ...existingBid,
                          price: Number(
                            existingBid.price
                          ),
                        }
                      : null
                  }
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-base font-bold leading-6 text-foreground">
        {value}
      </p>
    </div>
  );
}

function InfoSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function DetailCard({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value:
    | string
    | null
    | undefined;
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
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-foreground",
          emphasized
            ? "text-lg font-bold"
            : "text-sm font-semibold",
        ].join(" ")}
      >
        {value || "Не указано"}
      </p>
    </div>
  );
}

function getCategoryName(
  value:
    | { name: string }
    | Array<{ name: string }>
    | null
) {
  if (Array.isArray(value)) {
    return (
      value[0]?.name ??
      "Строительные работы"
    );
  }

  return (
    value?.name ??
    "Строительные работы"
  );
}

function formatPropertyType(
  value: string | null
) {
  switch (value) {
    case "apartment":
      return "Квартира";

    case "private_house":
      return "Частный дом";

    case "commercial":
      return "Коммерческий объект";

    case "land":
      return "Земельный участок";

    case "industrial":
      return "Производственный объект";

    case "other":
      return "Другое";

    default:
      return null;
  }
}

function formatBudget(
  min:
    | number
    | string
    | null,
  max:
    | number
    | string
    | null
) {
  const formatter =
    new Intl.NumberFormat(
      "ru-RU",
      {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
      }
    );

  if (
    min !== null &&
    max !== null
  ) {
    return `${formatter.format(
      Number(min)
    )} — ${formatter.format(
      Number(max)
    )}`;
  }

  if (min !== null) {
    return `От ${formatter.format(
      Number(min)
    )}`;
  }

  if (max !== null) {
    return `До ${formatter.format(
      Number(max)
    )}`;
  }

  return "Не указан";
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