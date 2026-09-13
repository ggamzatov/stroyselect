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
  Scale,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";

import { CustomerBidActions } from "@/features/bids/components/customer-bid-actions";
import { getCustomerBids } from "@/features/bids/queries/get-customer-bids";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

const ACTIVE_STATUSES = ["submitted", "viewed", "shortlisted"] as const;

export default async function CustomerBidsPage() {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");

  const bids = await getCustomerBids();
  const newCount = bids.filter((bid) => bid.status === "submitted").length;
  const waitingCount = bids.filter((bid) => ACTIVE_STATUSES.includes(bid.status as (typeof ACTIVE_STATUSES)[number])).length;
  const acceptedCount = bids.filter((bid) => bid.status === "accepted").length;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
      <div className="mx-auto max-w-[1180px]">
        <header className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.13em] text-primary">Выбор подрядчика</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">Сравните предложения</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                Цена, сроки и условия — в одном месте. Откройте профиль, чтобы проверить подрядчика перед решением.
              </p>
            </div>
            <span className="hidden shrink-0 rounded-2xl bg-secondary px-3 py-2 text-sm font-black text-primary sm:block">{bids.length}</span>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Состояние предложений">
          <SummaryCard label="Новые" value={newCount} tone="blue" />
          <SummaryCard label="Нужно решить" value={waitingCount} tone="orange" />
          <SummaryCard label="Принято" value={acceptedCount} tone="green" />
        </section>

        {bids.length === 0 ? (
          <section className="ui-v2-panel mt-8 flex min-h-[380px] items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Scale className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-black">Пока нечего сравнивать</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Когда подрядчики откликнутся на опубликованные проекты, здесь появятся их предложения.
              </p>
              <Link href="/customer/projects" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                Открыть проекты
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-8" aria-labelledby="offers-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="offers-title" className="text-xl font-black tracking-[-0.02em]">Все предложения</h2>
                <p className="mt-1 text-sm text-muted-foreground">Сравнивайте одинаковые параметры в каждом предложении.</p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground sm:hidden">{bids.length} всего</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {bids.map((bid) => {
                const project = getSingleRelation(bid.projects);
                const company = getSingleRelation(bid.contractor_companies);
                const profileHref = company?.id ? `/customer/contractors/${company.id}` : null;
                const projectHref = bid.status === "accepted" ? `/customer/work/${bid.project_id}` : `/customer/projects/${bid.project_id}`;
                const isAccepted = bid.status === "accepted";

                return (
                  <article key={bid.id} className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)] ${isAccepted ? "border-primary/30 ring-1 ring-primary/10" : "border-border"}`}>
                    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                      <BidStatusBadge status={bid.status} />
                      {isAccepted ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-primary">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Ваш выбор
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                          <UsersRound className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-foreground">{company?.public_name ?? "Подрядчик"}</h3>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                            {project?.city ?? "Город не указан"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <Metric label="Стоимость" value={formatMoney(bid.price)} icon={<Banknote className="h-3.5 w-3.5" aria-hidden="true" />} highlight />
                        <Metric label="Срок" value={`${bid.duration_days} ${formatDays(bid.duration_days)}`} icon={<Clock3 className="h-3.5 w-3.5" aria-hidden="true" />} />
                        <Metric label="Старт" value={formatDate(bid.proposed_start_date) ?? "—"} icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />} />
                      </div>

                      <div className="mt-4 rounded-xl bg-muted/45 p-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <MessageSquareText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          Условия подрядчика
                        </div>
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-5 text-foreground">{bid.message}</p>
                      </div>

                      {project?.title ? (
                        <p className="mt-4 truncate text-xs text-muted-foreground">
                          Проект: <span className="font-semibold text-foreground">{project.title}</span>
                        </p>
                      ) : null}

                      <div className="mt-auto pt-5">
                        <div className="grid gap-2">
                          {profileHref ? (
                            <Link href={profileHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold text-primary transition hover:bg-secondary">
                              <UserRoundSearch className="h-4 w-4" aria-hidden="true" />
                              Посмотреть подрядчика
                            </Link>
                          ) : null}
                          <Link href={projectHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-[#076c47]">
                            {isAccepted ? "Открыть рабочее пространство" : "Открыть проект"}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {!['accepted', 'rejected', 'withdrawn'].includes(bid.status) ? (
                      <div className="border-t border-border bg-muted/20 px-5 py-4">
                        <CustomerBidActions bidId={bid.id} currentStatus={bid.status} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "green" | "blue" | "orange" }) {
  const dot = tone === "blue" ? "bg-blue-500" : tone === "orange" ? "bg-[#f09a2b]" : "bg-primary";
  return (
    <div className="ui-v2-panel flex items-center justify-between p-4 sm:p-5">
      <div>
        <p className="text-3xl font-black tracking-[-0.04em] text-foreground">{value}</p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p>
      </div>
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
    </div>
  );
}

function Metric({ label, value, icon, highlight = false }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/70 p-3">
      <div className="flex items-center gap-1.5 text-primary">{icon}<span className="truncate text-[10px] font-bold text-muted-foreground">{label}</span></div>
      <p className={`mt-1.5 truncate ${highlight ? "text-sm font-black" : "text-xs font-bold"}`}>{value}</p>
    </div>
  );
}

function getSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function BidStatusBadge({ status }: { status: string }) {
  const config = getBidStatusConfig(status);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${config.className}`}>{config.label}</span>;
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
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(value));
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
