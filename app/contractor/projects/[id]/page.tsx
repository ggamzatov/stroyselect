import Link from "next/link";
import { redirect } from "next/navigation";

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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/contractor/projects"
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться к проектам
        </Link>

        <div className="mt-6">
          <p className="text-sm text-blue-700">
            {getCategoryName(
              project.service_categories
            )}
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {project.title}
          </h1>

          <p className="mt-3 text-slate-600">
            {project.city}
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Section title="Описание">
              <p className="whitespace-pre-wrap leading-7 text-slate-700">
                {project.description}
              </p>
            </Section>

            <Section title="Объект">
              <InfoRow
                label="Тип объекта"
                value={formatPropertyType(
                  project.property_type
                )}
              />

              <InfoRow
                label="Регион"
                value={project.region}
              />

              <InfoRow
                label="Город"
                value={project.city}
              />

              <InfoRow
                label="Адрес"
                value={project.address}
              />
            </Section>

            <Section title="Бюджет и сроки">
              <InfoRow
                label="Бюджет"
                value={formatBudget(
                  project.budget_min,
                  project.budget_max
                )}
              />

              <InfoRow
                label="Желаемое начало"
                value={formatDate(
                  project.desired_start_date
                )}
              />

              <InfoRow
                label="Желаемое окончание"
                value={formatDate(
                  project.desired_end_date
                )}
              />
            </Section>
          </div>

          <aside>
            <BidForm
              projectId={project.id}
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
          </aside>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </section>
  );
}
<Link
  href="/contractor/projects"
  className="inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
>
  Найти проекты
</Link>

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid gap-1 border-b pb-3 last:border-0 md:grid-cols-[220px_1fr]">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="font-medium">
        {value || "Не указано"}
      </span>
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

  return value?.name ??
    "Строительные работы";
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
  min: number | string | null,
  max: number | string | null
) {
  const formatter = new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  );

  if (min !== null && max !== null) {
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
  ).format(new Date(`${value}T00:00:00`));
}