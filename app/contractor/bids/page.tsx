import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
} from "lucide-react";

import { getMyBids } from "@/features/bids/queries/get-my-bids";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function ContractorBidsPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const bids = await getMyBids();
  const activeCount = bids.filter((bid) =>
    ["submitted", "viewed", "shortlisted"].includes(bid.status)
  ).length;
  const acceptedCount = bids.filter((bid) => bid.status === "accepted").length;
  const closedCount = bids.filter((bid) =>
    ["rejected", "withdrawn"].includes(bid.status)
  ).length;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <section className="ui-v2-panel relative overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_70%_45%,rgba(170,216,190,0.55),transparent_60%)] lg:block" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                Работа с заказами
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl">
                Мои предложения
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Следите за откликами, реакцией заказчиков и принятыми предложениями в одном месте.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              <SummaryMetric label="На рассмотрении" value={activeCount} />
              <SummaryMetric label="Принято" value={acceptedCount} />
              <SummaryMetric label="Закрыто" value={closedCount} />
            </div>
          </div>
        </section>

        {bids.length === 0 ? (
          <EmptyBids />
        ) : (
          <section className="mt-5 space-y-3" aria-label="Предложения подрядчика">
            {bids.map((bid) => {
              const project = getProject(bid.projects);
              const href =
                bid.status === "accepted"
                  ? `/contractor/work/${bid.project_id}`
                  : `/contractor/projects/${bid.project_id}`;

              return (
                <Link
                  key={bid.id}
                  href={href}
                  className="group block rounded-[1.35rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-card)] sm:p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 xl:flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <BidStatusBadge status={bid.status} />
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatDate(bid.created_at)}
                        </span>
                      </div>

                      <h2 className="mt-3 text-lg font-black tracking-[-0.02em] text-foreground sm:text-xl">
                        {project?.title ?? "Проект"}
                      </h2>

                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">{project?.city ?? "Город не указан"}</span>
                      </div>

                      <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {bid.message}
                      </p>
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-3 xl:w-[520px] xl:shrink-0">
                      <InfoItem
                        icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
                        label="Стоимость"
                        value={formatMoney(bid.price)}
                        emphasized
                      />
                      <InfoItem
                        icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
                        label="Срок"
                        value={`${bid.duration_days} ${formatDays(bid.duration_days)}`}
                      />
                      <div className="flex min-h-[74px] items-center justify-between rounded-xl border border-border bg-background/70 px-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            Следующее действие
                          </p>
                          <p className="mt-1 truncate text-sm font-bold text-primary">
                            {bid.status === "accepted" ? "Открыть объект" : "Открыть проект"}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary transition group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/85 px-3 py-3 text-center shadow-sm">
      <p className="text-xl font-black tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyBids() {
  return (
    <section className="mt-5 flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card/70 px-6 text-center shadow-[var(--shadow-soft)]">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Search className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold">Предложений пока нет</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Откройте подходящий проект и отправьте заказчику стоимость, сроки и условия выполнения.
        </p>
        <Link
          href="/contractor/projects"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
        >
          Найти проекты
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
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
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function InfoItem({
  icon,
  label,
  value,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className={[
      "min-w-0 rounded-xl border border-border px-4 py-3",
      emphasized ? "bg-secondary/70" : "bg-background/70",
    ].join(" ")}>
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className={[
        "mt-1 truncate text-foreground",
        emphasized ? "text-base font-black" : "text-sm font-bold",
      ].join(" ")}>
        {value}
      </p>
    </div>
  );
}

function BidStatusBadge({ status }: { status: string }) {
  const config = getBidStatusConfig(status);

  return (
    <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", config.className].join(" ")}>
      {status === "accepted" ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {config.label}
    </span>
  );
}

function getBidStatusConfig(status: string) {
  switch (status) {
    case "submitted":
      return { label: "Отправлено", className: "bg-secondary text-secondary-foreground" };
    case "viewed":
      return { label: "Просмотрено", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
    case "shortlisted":
      return { label: "В коротком списке", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
    case "accepted":
      return { label: "Принято", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" };
    case "rejected":
      return { label: "Отклонено", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" };
    case "withdrawn":
      return { label: "Отозвано", className: "bg-muted text-muted-foreground" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

function formatDays(value: number) {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}
