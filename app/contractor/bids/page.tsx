import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getMyBids } from "@/features/bids/queries/get-my-bids";

export default async function ContractorBidsPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const bids = await getMyBids();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/contractor/dashboard"
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться в кабинет
        </Link>

        <div className="mt-6">
          <p className="text-sm text-slate-500">
            Кабинет подрядчика
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Мои предложения
          </h1>

          <p className="mt-3 text-slate-600">
            Здесь отображаются все ваши отклики на проекты
            заказчиков.
          </p>
        </div>

        {bids.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">
              Предложений пока нет
            </h2>

            <p className="mt-2 text-slate-600">
              Откройте доступный проект и отправьте заказчику
              стоимость и сроки выполнения.
            </p>

            <Link
              href="/contractor/projects"
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
            >
              Найти проекты
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {bids.map((bid) => {
              const project = getProject(bid.projects);
              const isAssignedProject =
                project?.status === "contractor_selected" ||
                project?.status === "in_progress" ||
                project?.status === "completed" ||
                project?.status === "disputed";

              return (
                <Link
                key={bid.id}
                href={
                    bid.status === "accepted"
                    ? `/contractor/work/${bid.project_id}`
                    : `/contractor/projects/${bid.project_id}`
                }
                 className="block rounded-2xl border bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">
                        {project?.city ?? "Город не указан"}
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">
                        {project?.title ?? "Проект"}
                      </h2>
                    </div>

                    <BidStatusBadge status={bid.status} />
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <InfoItem
                      label="Ваше предложение"
                      value={formatMoney(bid.price)}
                    />

                    <InfoItem
                      label="Срок выполнения"
                      value={`${bid.duration_days} ${formatDays(
                        bid.duration_days
                      )}`}
                    />

                    <InfoItem
                      label="Дата отправки"
                      value={formatDate(bid.created_at)}
                    />
                  </div>

                  <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-600">
                    {bid.message}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function getProject(
  value:
    | {
        id: string;
        title: string;
        city: string;
        status: string;
        budget_min: number | string | null;
        budget_max: number | string | null;
      }
    | Array<{
        id: string;
        title: string;
        city: string;
        status: string;
        budget_min: number | string | null;
        budget_max: number | string | null;
      }>
    | null
) {
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
        label: "Отправлено",
        className: "bg-blue-100 text-blue-800",
      };

    case "viewed":
      return {
        label: "Просмотрено заказчиком",
        className: "bg-purple-100 text-purple-800",
      };

    case "shortlisted":
      return {
        label: "В коротком списке",
        className: "bg-amber-100 text-amber-800",
      };

    case "accepted":
      return {
        label: "Принято",
        className: "bg-green-100 text-green-800",
      };

    case "rejected":
      return {
        label: "Отклонено",
        className: "bg-red-100 text-red-800",
      };

    case "withdrawn":
      return {
        label: "Отозвано",
        className: "bg-slate-200 text-slate-800",
      };

    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700",
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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