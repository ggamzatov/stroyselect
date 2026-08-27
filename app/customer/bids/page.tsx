import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquareText,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";

import { CustomerBidActions } from "@/features/bids/components/customer-bid-actions";
import { getCustomerBids } from "@/features/bids/queries/get-customer-bids";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function CustomerBidsPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const bids = await getCustomerBids();
  const activeCount = bids.filter((bid) => ["submitted", "viewed", "shortlisted"].includes(bid.status)).length;
  const acceptedCount = bids.filter((bid) => bid.status === "accepted").length;
  const newCount = bids.filter((bid) => bid.status === "submitted").length;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <section>
          <p className="text-sm font-semibold text-primary">Выбор исполнителя</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-foreground sm:text-4xl">
            Предложения подрядчиков
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Сравнивайте стоимость, сроки, условия и профиль подрядчика перед выбором исполнителя.
          </p>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Сводка по предложениям">
          <SummaryCard label="Новые предложения" value={newCount} tone="blue" />
          <SummaryCard label="Требуют решения" value={activeCount} tone="orange" />
          <SummaryCard label="Принято" value={acceptedCount} tone="green" />
        </section>

        <section className="mt-6" aria-labelledby="customer-bids-list-title">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Все отклики</p>
              <h2 id="customer-bids-list-title" className="mt-1 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                Предложения подрядчиков
              </h2>
            </div>
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {bids.length}
            </span>
          </div>

          {bids.length === 0 ? (
            <EmptyBids />
          ) : (
            <div className="space-y-4">
              {bids.map((bid) => {
                const project = getSingleRelation(bid.projects);
                const company = getSingleRelation(bid.contractor_companies);
                const proposalHref =
                  bid.status === "accepted"
                    ? `/customer/work/${bid.project_id}`
                    : `/customer/projects/${bid.project_id}`;
                const contractorProfileHref = company?.id
                  ? `/customer/contractors/${company.id}`
                  : null;

                return (
                  <article key={bid.id} className="ui-v2-panel overflow-hidden">
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <BidStatusBadge status={bid.status} />
                            <span className="truncate text-xs font-semibold text-muted-foreground">
                              {project?.title ?? "Проект"}
                            </span>
                          </div>

                          <div className="mt-3 flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                              <UsersRound className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-xl font-black tracking-[-0.02em] text-foreground">
                                {company?.public_name ?? "Подрядчик"}
                              </h3>
                              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                <span className="truncate">{project?.city ?? "Город не указан"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:w-[520px]">
                          <ProposalMetric
                            icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
                            label="Стоимость"
                            value={formatMoney(bid.price)}
                            emphasized
                          />
                          <ProposalMetric
                            icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
                            label="Срок"
                            value={`${bid.duration_days} ${formatDays(bid.duration_days)}`}
                          />
                          <ProposalMetric
                            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                            label="Начало"
                            value={formatDate(bid.proposed_start_date) ?? "Не указано"}
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="rounded-xl border border-border bg-background/70 p-4">
                          <div className="flex items-center gap-2 text-primary">
                            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                              Сообщение подрядчика
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                            {bid.message}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {contractorProfileHref ? (
                            <Link
                              href={contractorProfileHref}
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-primary transition hover:bg-secondary"
                            >
                              <UserRoundSearch className="h-4 w-4" aria-hidden="true" />
                              Профиль подрядчика
                            </Link>
                          ) : null}
                          <Link
                            href={proposalHref}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-[#076c47]"
                          >
                            {bid.status === "accepted" ? "Открыть работу" : "Открыть проект"}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {!['accepted', 'rejected', 'withdrawn'].includes(bid.status) ? (
                      <div className="border-t border-border bg-background/40 px-5 py-4 sm:px-6">
                        <CustomerBidActions bidId={bid.id} currentStatus={bid.status} />
                      </div>
                    ) : null}

                    {bid.status === "accepted" ? (
                      <div className="flex flex-col gap-3 border-t border-border bg-emerald-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:bg-emerald-950/10">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Предложение принято. Подрядчик назначен исполнителем.
                        </div>
                        <Link
                          href={`/customer/work/${bid.project_id}`}
                          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300"
                        >
                          Открыть рабочее пространство
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    ) : null}

                    {bid.status === "rejected" ? (
                      <div className="border-t border-border bg-red-50/50 px-5 py-3 text-sm font-medium text-red-700 sm:px-6 dark:bg-red-950/10 dark:text-red-300">
                        Предложение отклонено.
                      </div>
                    ) : null}

                    {bid.status === "withdrawn" ? (
                      <div className="border-t border-border bg-muted/50 px-5 py-3 text-sm text-muted-foreground sm:px-6">
                        Подрядчик отозвал предложение.
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "blue" | "orange";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-500"
      : tone === "orange"
        ? "bg-[#f09a2b]"
        : "bg-primary";

  return (
    <div className="ui-v2-panel flex items-center justify-between gap-4 p-4 sm:p-5">
      <div>
        <p className="text-3xl font-black tracking-[-0.04em] text-foreground">{value}</p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p>
      </div>
      <span className={`h-3 w-3 rounded-full ${toneClass}`} aria-hidden="true" />
    </div>
  );
}

function ProposalMetric({
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
    <div className="rounded-xl border border-border bg-background/70 px-3.5 py-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className={`mt-1.5 truncate ${emphasized ? "text-base font-black" : "text-sm font-bold"}`}>{value}</p>
    </div>
  );
}

function EmptyBids() {
  return (
    <div className="ui-v2-panel flex min-h-[360px] items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <UsersRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-black tracking-tight text-foreground">Предложений пока нет</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Когда подрядчики откликнутся на опубликованные проекты, их предложения появятся здесь.
        </p>
        <Link
          href="/customer/projects"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          Мои проекты
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function getSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function BidStatusBadge({ status }: { status: string }) {
  const config = getBidStatusConfig(status);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${config.className}`}>
      {config.label}
    </span>
  );
}

function getBidStatusConfig(status: string) {
  switch (status) {
    case "submitted":
      return { label: "Новое", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
    case "viewed":
      return { label: "Просмотрено", className: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" };
    case "shortlisted":
      return { label: "В коротком списке", className: "bg-[#fff2dc] text-[#b96a00]" };
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

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

function formatDays(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "дней";
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}
