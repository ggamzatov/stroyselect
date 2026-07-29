import Link from "next/link";

import {
  getContractorsForReview,
  type ContractorReviewFilter,
} from
  "@/features/admin/contractors/queries/get-contractors-for-review";

import { VerificationStatusBadge } from
  "@/features/admin/contractors/components/verification-status-badge";

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
  const params = await searchParams;

  const requestedStatus =
    params.status ?? "pending";

  const filter =
    ALLOWED_FILTERS.includes(
      requestedStatus as
        (typeof ALLOWED_FILTERS)[number]
    )
      ? (requestedStatus as
          ContractorReviewFilter)
      : "pending";

  const contractors =
    await getContractorsForReview(filter);

  return (
    <div>
      <div>
        <p className="text-sm text-slate-500">
          Проверка исполнителей
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Подрядчики
        </h1>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterLink
          href="/admin/contractors?status=pending"
          label="Ожидают проверки"
          active={filter === "pending"}
        />

        <FilterLink
          href="/admin/contractors?status=verified"
          label="Подтверждённые"
          active={filter === "verified"}
        />

        <FilterLink
          href="/admin/contractors?status=rejected"
          label="Отклонённые"
          active={filter === "rejected"}
        />

        <FilterLink
          href="/admin/contractors?status=suspended"
          label="Приостановленные"
          active={filter === "suspended"}
        />

        <FilterLink
          href="/admin/contractors?status=all"
          label="Все"
          active={filter === "all"}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
        {contractors.length === 0 ? (
          <div className="p-10 text-center">
            <h2 className="font-semibold">
              Подрядчиков нет
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              В выбранной категории пока нет
              профилей.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {contractors.map((company) => (
              <Link
                key={company.id}
                href={`/admin/contractors/${company.id}`}
                className="grid gap-4 p-5 hover:bg-slate-50 md:grid-cols-[1fr_180px_170px]"
              >
                <div>
                  <h2 className="font-semibold text-slate-950">
                    {company.public_name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    {company.legal_name ||
                      "Юридическое название не указано"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    {company.inn && (
                      <span>
                        ИНН: {company.inn}
                      </span>
                    )}

                    {company
                      .contractor_service_areas
                      ?.slice(0, 3)
                      .map((area) => (
                        <span
                          key={area.city}
                          className="rounded-full bg-slate-100 px-2 py-1"
                        >
                          {area.city}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  Обновлён:
                  <br />
                  {formatDate(company.updated_at)}
                </div>

                <div>
                  <VerificationStatusBadge
                    status={
                      company.verification_status
                    }
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        active
          ? "bg-slate-900 text-white"
          : "border bg-white text-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}