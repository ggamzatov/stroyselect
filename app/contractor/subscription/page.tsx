import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { createSubscriptionCheckout } from "@/features/subscriptions/actions/create-subscription-checkout";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { db } from "@/lib/db/pool";
import { getContractorMarketplaceAccess } from "@/lib/subscriptions/contractor-marketplace-access";

type Plan = {
  id: string;
  name: string;
  duration_months: number;
  price_minor: string | number;
  currency: string;
};

type Company = {
  id: string;
  public_name: string;
  verification_status: string;
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContractorSubscriptionPage({ searchParams }: Props) {
  const activeUser = await requireActiveUser();
  if (!activeUser.success) redirect("/login");
  if (activeUser.profile.role !== "contractor") redirect("/dashboard");

  const companyResult = await db.query<Company>(
    `SELECT id,public_name,verification_status::text AS verification_status FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,
    [activeUser.user.id]
  );
  const company = companyResult.rows[0];
  if (!company) redirect("/contractor/company");

  const [access, plansResult, query] = await Promise.all([
    getContractorMarketplaceAccess(company.id),
    db.query<Plan>(
      `SELECT id,name,duration_months,price_minor,currency FROM public.contractor_subscription_plans WHERE is_active=true ORDER BY sort_order,duration_months`
    ),
    searchParams,
  ]);

  const notice = query.payment
    ? "Возврат с платёжной страницы выполнен. Доступ включится только после подтверждения успешной оплаты ЮKassa."
    : query.error === "provider"
      ? "ЮKassa ещё не настроена администратором. Тарифы доступны для просмотра, но оплата временно недоступна."
      : query.error
        ? "Не удалось начать оплату. Проверьте данные или попробуйте позже."
        : null;

  return (
    <main className="min-h-screen bg-background">
      <div className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
        <div className="mx-auto max-w-[1420px] space-y-5">
          <section className="ui-v2-panel overflow-hidden p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Доступ к новым заказам
                </div>
                <h1 className="mt-4 text-2xl font-black tracking-[-0.035em] sm:text-3xl lg:text-4xl">
                  Подписка StroySelect
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Подписка открывает новые проекты и отправку предложений. Уже заключённые
                  проекты, договоры, чат, документы и этапы остаются доступны даже после
                  окончания тарифа.
                </p>
              </div>

              <div className="w-full rounded-2xl border border-border bg-background/70 p-5 lg:w-[360px]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Текущий доступ</p>
                    <p className="mt-1 text-2xl font-black">
                      {access.hasAccess ? "Активен" : "Нужна подписка"}
                    </p>
                  </div>
                  <span
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      access.hasAccess
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-secondary text-primary",
                    ].join(" ")}
                  >
                    {access.hasAccess ? (
                      <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                </div>

                {access.hasAccess && access.currentPeriodEnd ? (
                  <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                    до {formatDate(access.currentPeriodEnd)}
                  </p>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Новые заказы и отправка предложений откроются после подтверждённой оплаты.
                  </p>
                )}
              </div>
            </div>
          </section>

          {notice ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 shadow-[var(--shadow-soft)]">
              {notice}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-3" aria-label="Что даёт подписка">
            <Benefit
              icon={<Sparkles className="h-5 w-5" />}
              title="Новые проекты"
              text="Просматривайте доступные заказы, которые соответствуют профилю компании."
            />
            <Benefit
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Отправка предложений"
              text="Откликайтесь на подходящие проекты через существующий безопасный bid-flow."
            />
            <Benefit
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Работы не блокируются"
              text="Текущие объекты, документы и договоры остаются доступны после окончания тарифа."
            />
          </section>

          {company.verification_status !== "verified" ? (
            <section className="ui-v2-panel p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff2dc] text-[#a85f00]">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-xl font-black">Сначала завершите проверку компании</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Оплата доступа станет доступна после подтверждения профиля администратором.
                    </p>
                  </div>
                </div>
                <Link
                  href="/contractor/company"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold text-primary transition hover:bg-secondary"
                >
                  Перейти к профилю
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          ) : (
            <section aria-labelledby="plans-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Тарифы</p>
                  <h2 id="plans-title" className="mt-1 text-2xl font-black tracking-tight">
                    Выберите срок доступа
                  </h2>
                </div>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Оплата подтверждается только webhook ЮKassa
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {plansResult.rows.map((plan, index) => (
                  <form
                    action={createSubscriptionCheckout}
                    key={plan.id}
                    className={[
                      "ui-v2-panel flex min-h-[330px] flex-col p-5 sm:p-6",
                      index === 1 ? "border-primary/25 shadow-[var(--shadow-card)]" : "",
                    ].join(" ")}
                  >
                    <input type="hidden" name="planId" value={plan.id} />

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-primary">{plan.name}</p>
                      {index === 1 ? (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary">
                          Популярный срок
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-5 text-3xl font-black tracking-[-0.04em]">
                      {formatMoney(plan.price_minor, plan.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.round(
                        Number(plan.price_minor) / 100 / plan.duration_months
                      ).toLocaleString("ru-RU")} {" "}
                      ₽ в месяц
                    </p>

                    <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                      <PlanPoint>Доступ к новым заказам</PlanPoint>
                      <PlanPoint>Отправка предложений</PlanPoint>
                      <PlanPoint>{plan.duration_months} мес. оплаченного периода</PlanPoint>
                    </div>

                    <label className="mt-5 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
                      <input type="checkbox" name="savePaymentMethod" className="mt-1" />
                      <span>
                        Сохранить способ оплаты для будущего автопродления. Автосписание будет
                        включаться только после отдельного согласия и настройки.
                      </span>
                    </label>

                    <button className="mt-auto min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.16)]">
                      Оплатить {plan.name.toLowerCase()}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="ui-v2-panel p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-black">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function PlanPoint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function formatMoney(minor: string | number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(minor) / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(value));
}
