import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getCustomerBids } from
  "@/features/bids/queries/get-customer-bids";

import { CustomerBidActions } from
  "@/features/bids/components/customer-bid-actions";

export default async function CustomerBidsPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const bids = await getCustomerBids();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/customer/dashboard"
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться в кабинет
        </Link>

        <div className="mt-6">
          <p className="text-sm text-slate-500">
            Кабинет заказчика
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Предложения подрядчиков
          </h1>

          <p className="mt-3 text-slate-600">
            Сравните стоимость, сроки и условия
            подрядчиков.
          </p>
        </div>

        {bids.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">
              Предложений пока нет
            </h2>

            <p className="mt-2 text-slate-600">
              После отклика подрядчика его
              предложение появится здесь.
            </p>

            <Link
              href="/customer/projects"
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
            >
              Мои проекты
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {bids.map((bid) => {
              const project =
                getSingleRelation(bid.projects);

              const company =
                getSingleRelation(
                  bid.contractor_companies
                );

              return (
                <article
                  key={bid.id}
                  className="rounded-2xl border bg-white p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-blue-700">
                        {project?.title ??
                          "Проект"}
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">
                        {company?.public_name ??
                          "Подрядчик"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        {project?.city ??
                          "Город не указан"}
                      </p>
                    </div>

                    <BidStatusBadge
                      status={bid.status}
                    />
                  </div>

                  <div className="mt-6 grid gap-5 sm:grid-cols-3">
                    <InfoItem
                      label="Стоимость"
                      value={formatMoney(
                        bid.price
                      )}
                    />

                    <InfoItem
                      label="Срок"
                      value={`${bid.duration_days} ${formatDays(
                        bid.duration_days
                      )}`}
                    />

                    <InfoItem
                      label="Возможное начало"
                      value={
                        formatDate(
                          bid.proposed_start_date
                        ) ?? "Не указано"
                      }
                    />
                  </div>

                  <div className="mt-6 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Сообщение подрядчика
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {bid.message}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4 text-sm">
                    {company?.contact_phone && (
                      <span>
                        Телефон:{" "}
                        {company.contact_phone}
                      </span>
                    )}

                    {company?.contact_email && (
                      <span>
                        Email:{" "}
                        {company.contact_email}
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <CustomerBidActions
                      bidId={bid.id}
                      currentStatus={bid.status}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function getSingleRelation<T>(
  value: T | T[] | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

function BidStatusBadge({
  status,
}: {
  status: string;
}) {
  const config = getBidStatusConfig(status);

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function getBidStatusConfig(status: string) {
  switch (status) {
    case "submitted":
      return {
        label: "Новое",
        className:
          "bg-blue-100 text-blue-800",
      };

    case "viewed":
      return {
        label: "Просмотрено",
        className:
          "bg-purple-100 text-purple-800",
      };

    case "shortlisted":
      return {
        label: "В коротком списке",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "accepted":
      return {
        label: "Принято",
        className:
          "bg-green-100 text-green-800",
      };

    case "rejected":
      return {
        label: "Отклонено",
        className:
          "bg-red-100 text-red-800",
      };

    case "withdrawn":
      return {
        label: "Отозвано",
        className:
          "bg-slate-200 text-slate-800",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-700",
      };
  }
}

function formatMoney(
  value: number | string
) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDays(value: number) {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;

  if (
    lastTwoDigits >= 11 &&
    lastTwoDigits <= 14
  ) {
    return "дней";
  }

  if (lastDigit === 1) {
    return "день";
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4
  ) {
    return "дня";
  }

  return "дней";
}