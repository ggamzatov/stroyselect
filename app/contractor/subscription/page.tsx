import { BadgeCheck, CalendarDays, CreditCard, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getContractorMarketplaceAccess } from "@/lib/subscriptions/contractor-marketplace-access";
import { createSubscriptionCheckout } from "@/features/subscriptions/actions/create-subscription-checkout";

type Plan={id:string;name:string;duration_months:number;price_minor:string|number;currency:string};
type Company={id:string;public_name:string;verification_status:string};
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};

export default async function ContractorSubscriptionPage({searchParams}:Props){
  const activeUser=await requireActiveUser();
  if(!activeUser.success)redirect("/login");
  if(activeUser.profile.role!=="contractor")redirect("/dashboard");
  const companyResult=await db.query<Company>(`SELECT id,public_name,verification_status::text AS verification_status FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,[activeUser.user.id]);
  const company=companyResult.rows[0];
  if(!company)redirect("/contractor/company");
  const [access,plansResult,query]=await Promise.all([
    getContractorMarketplaceAccess(company.id),
    db.query<Plan>(`SELECT id,name,duration_months,price_minor,currency FROM public.contractor_subscription_plans WHERE is_active=true ORDER BY sort_order,duration_months`),
    searchParams,
  ]);
  const notice=query.payment?"Возврат с платёжной страницы выполнен. Доступ включится только после подтверждения успешной оплаты ЮKassa.":query.error==="provider"?"ЮKassa ещё не настроена администратором. Тарифы доступны для просмотра, но оплата временно недоступна.":query.error?"Не удалось начать оплату. Проверьте данные или попробуйте позже.":null;
  return <main className="min-h-screen bg-background"><div className="app-container space-y-6 py-8 md:py-12">
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><CreditCard className="h-5 w-5"/></div><div><p className="text-sm font-semibold text-primary">Доступ к новым заказам</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em] md:text-4xl">Подписка StroySelect</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Подписка открывает новые проекты и отправку предложений. Уже заключённые проекты, договоры, чат, документы и этапы остаются доступны даже после окончания тарифа.</p></div></div></section>
    {notice&&<div className="rounded-2xl border border-border bg-card p-4 text-sm leading-6">{notice}</div>}
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-muted-foreground">Текущий доступ</p><p className="mt-1 text-2xl font-black">{access.hasAccess?"Активен":"Нужна подписка"}</p>{access.hasAccess&&access.currentPeriodEnd&&<p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4"/>до {formatDate(access.currentPeriodEnd)}</p>}</div><div className={access.hasAccess?"rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700":"rounded-full bg-secondary px-4 py-2 text-sm font-bold text-primary"}>{access.hasAccess?<><BadgeCheck className="mr-1 inline h-4 w-4"/>Можно принимать новые заказы</>:<><LockKeyhole className="mr-1 inline h-4 w-4"/>Новые заказы закрыты</>}</div></div></section>
    {company.verification_status!=="verified"?<section className="rounded-[1.75rem] border border-border bg-card p-6"><h2 className="text-xl font-bold">Сначала завершите проверку компании</h2><p className="mt-2 text-sm text-muted-foreground">Оплата доступа станет доступна после подтверждения профиля администратором.</p></section>:<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{plansResult.rows.map(plan=><form action={createSubscriptionCheckout} key={plan.id} className="flex flex-col rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><input type="hidden" name="planId" value={plan.id}/><p className="text-sm font-bold text-primary">{plan.name}</p><p className="mt-4 text-3xl font-black">{formatMoney(plan.price_minor,plan.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{Math.round(Number(plan.price_minor)/100/plan.duration_months).toLocaleString("ru-RU")} ₽ в месяц</p><label className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><input type="checkbox" name="savePaymentMethod" className="mt-1"/><span>Сохранить способ оплаты для будущего автопродления. Автосписание будет включаться только после отдельного согласия и настройки.</span></label><button className="mt-auto min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Оплатить {plan.name.toLowerCase()}</button></form>)}</section>}
  </div></main>;
}
function formatMoney(minor:string|number,currency:string){return new Intl.NumberFormat("ru-RU",{style:"currency",currency,maximumFractionDigits:0}).format(Number(minor)/100)}
function formatDate(v:string){return new Intl.DateTimeFormat("ru-RU",{dateStyle:"long"}).format(new Date(v))}
