import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CircleDollarSign, Clock3, Megaphone, ShieldCheck, Sparkles } from "lucide-react";

import { requireActiveUser } from "@/lib/auth/require-active-user";
import { db } from "@/lib/db/pool";
import { createAdCheckout, createAdDraft, saveAdAdvertiser, submitAdForModeration } from "@/features/ads/actions/advertising";

type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
type Company={id:string;public_name:string;legal_name:string|null;inn:string|null;ogrn:string|null;website:string|null;contact_email:string|null;contact_phone:string|null;verification_status:string};
type Advertiser={id:string;display_name:string;legal_name:string;inn:string;ogrn:string|null;website_url:string|null;contact_email:string|null;contact_phone:string|null;status:string;verification_notes:string|null};
type Placement={id:string;code:string;name:string;description:string|null;unit_price_minor:string|number;currency:string;min_days:number;max_days:number};
type Order={id:string;status:string;amount_minor:string|number;currency:string;duration_days_snapshot:number;placement_name_snapshot:string;title_snapshot:string;body_snapshot:string;destination_url_snapshot:string;created_at:Date|string;scheduled_from:Date|string|null;scheduled_to:Date|string|null;rejection_reason:string|null;creative_status:string;erid:string|null;ord_provider:string|null;payment_status:string|null;impressions:string|number;clicks:string|number};

export default async function ContractorAdvertisingPage({searchParams}:Props){
  const [activeUser,query]=await Promise.all([requireActiveUser(),searchParams]);
  if(!activeUser.success)redirect("/login");
  if(activeUser.profile.role!=="contractor")redirect("/dashboard");
  const companyResult=await db.query<Company>(`SELECT id,public_name,legal_name,inn,ogrn,website,contact_email,contact_phone,verification_status FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,[activeUser.user.id]);
  const company=companyResult.rows[0];if(!company)redirect("/contractor/company");
  const [advertiserResult,placementsResult,ordersResult]=await Promise.all([
    db.query<Advertiser>(`SELECT id,display_name,legal_name,inn,ogrn,website_url,contact_email,contact_phone,status,verification_notes FROM public.ad_advertisers WHERE owner_user_id=$1::uuid LIMIT 1`,[activeUser.user.id]),
    db.query<Placement>(`SELECT id,code,name,description,unit_price_minor,currency,min_days,max_days FROM public.ad_placements WHERE is_active=true AND code<>'supplier_boost' ORDER BY sort_order,name`),
    db.query<Order>(`
      SELECT o.id,o.status,o.amount_minor,o.currency,o.duration_days_snapshot,o.placement_name_snapshot,o.title_snapshot,o.body_snapshot,o.destination_url_snapshot,o.created_at,o.scheduled_from,o.scheduled_to,o.rejection_reason,
        cr.status AS creative_status,cr.erid,cr.ord_provider,
        (SELECT p.status FROM public.ad_order_payments p WHERE p.order_id=o.id ORDER BY p.created_at DESC LIMIT 1) AS payment_status,
        COUNT(e.id) FILTER (WHERE e.event_type='impression') AS impressions,
        COUNT(e.id) FILTER (WHERE e.event_type='click') AS clicks
      FROM public.ad_orders o
      JOIN public.ad_advertisers a ON a.id=o.advertiser_id
      JOIN public.ad_creatives cr ON cr.id=o.creative_id
      LEFT JOIN public.ad_events e ON e.order_id=o.id
      WHERE a.owner_user_id=$1::uuid
      GROUP BY o.id,cr.status,cr.erid,cr.ord_provider
      ORDER BY o.created_at DESC
    `,[activeUser.user.id]),
  ]);
  const advertiser=advertiserResult.rows[0]??null;
  const message=query.created?"Рекламный заказ создан. Оплата не запускает показ автоматически.":query.moderation?"Оплаченный креатив отправлен на модерацию.":query.payment?"Возврат из YooKassa выполнен. Статус оплаты подтверждается только серверным webhook.":query.saved?"Данные рекламодателя сохранены.":query.error?errorMessage(String(query.error)):null;

  return <main className="min-h-screen bg-background"><div className="app-container space-y-7 py-8 md:py-12">
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8"><div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl"/><div className="relative flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Megaphone className="h-5 w-5"/></div><div><p className="text-sm font-semibold text-primary">Коммерческое продвижение</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em] md:text-5xl">Реклама в StroySelect</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Создавайте отдельные рекламные размещения. Спонсорские блоки всегда помечаются как реклама и не меняют органический matching, рейтинг или порядок обычной выдачи.</p></div></div></section>
    {message&&<div className="rounded-2xl border border-border bg-card p-4 text-sm font-semibold">{message}</div>}

    <section className="grid gap-5 lg:grid-cols-3"><Info icon={<CircleDollarSign className="h-5 w-5"/>} title="Оплата" text="YooKassa подтверждает оплату серверным webhook. Возврат из браузера не даёт рекламных прав."/><Info icon={<ShieldCheck className="h-5 w-5"/>} title="Модерация" text="После оплаты креатив отдельно проходит модерацию. Оплаченный заказ не публикуется автоматически."/><Info icon={<BadgeCheck className="h-5 w-5"/>} title="ЕРИР / ERID" text="Перед показом администратор фиксирует ERID и оператора рекламных данных. Без этого база не разрешит активацию."/></section>

    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Шаг 1</p><h2 className="mt-1 text-2xl font-bold">Рекламодатель</h2></div>{advertiser&&<Status value={advertiser.status}/>}</div><form action={saveAdAdvertiser} className="mt-5 grid gap-4 md:grid-cols-2">
      <Field label="Название в рекламе"><input name="displayName" required maxLength={200} defaultValue={advertiser?.display_name??company.public_name} className="stroy-input mt-1"/></Field>
      <Field label="Юридическое наименование"><input name="legalName" required maxLength={240} defaultValue={advertiser?.legal_name??company.legal_name??""} className="stroy-input mt-1"/></Field>
      <Field label="ИНН"><input name="inn" inputMode="numeric" required defaultValue={advertiser?.inn??company.inn??""} className="stroy-input mt-1"/></Field>
      <Field label="ОГРН / ОГРНИП"><input name="ogrn" inputMode="numeric" defaultValue={advertiser?.ogrn??company.ogrn??""} className="stroy-input mt-1"/></Field>
      <Field label="Сайт рекламодателя"><input name="websiteUrl" type="url" defaultValue={advertiser?.website_url??company.website??""} placeholder="https://example.ru" className="stroy-input mt-1"/></Field>
      <Field label="Email"><input name="contactEmail" type="email" defaultValue={advertiser?.contact_email??company.contact_email??""} className="stroy-input mt-1"/></Field>
      <Field label="Телефон"><input name="contactPhone" defaultValue={advertiser?.contact_phone??company.contact_phone??""} className="stroy-input mt-1"/></Field>
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm leading-6 md:col-span-2"><input name="legalConfirmed" type="checkbox" required defaultChecked={Boolean(advertiser)} className="mt-1"/><span>Подтверждаю достоверность реквизитов, законность рекламируемого объекта и целевой страницы, а также то, что реклама не ведёт на ресурс, размещение рекламы на котором запрещено законодательством РФ.</span></label>
      <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground md:w-fit">Сохранить рекламодателя</button>
    </form>{advertiser?.verification_notes&&<p className="mt-4 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">Комментарий проверки: {advertiser.verification_notes}</p>}</section>

    {advertiser?.status==="verified"&&<section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><p className="text-sm font-semibold text-primary">Шаг 2</p><h2 className="mt-1 text-2xl font-bold">Создать рекламный заказ</h2><form action={createAdDraft} className="mt-5 grid gap-4 md:grid-cols-2">
      <Field label="Название кампании"><input name="campaignName" required maxLength={200} placeholder="Например: Продвижение ремонта квартир" className="stroy-input mt-1"/></Field>
      <Field label="Место размещения"><select name="placementId" required className="stroy-input mt-1"><option value="">Выберите размещение</option>{placementsResult.rows.map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.unit_price_minor,p.currency)}/день</option>)}</select></Field>
      <Field label="Количество дней"><input name="durationDays" type="number" min="1" max="90" defaultValue="7" required className="stroy-input mt-1"/></Field>
      <Field label="Целевой город (необязательно)"><input name="targetCity" maxLength={160} placeholder="Махачкала" className="stroy-input mt-1"/></Field>
      <Field label="Slug категории (необязательно)"><input name="targetCategory" maxLength={160} placeholder="general-construction" className="stroy-input mt-1"/></Field>
      <Field label="Заголовок"><input name="title" required maxLength={180} className="stroy-input mt-1"/></Field>
      <Field label="Текст рекламы" wide><textarea name="body" required maxLength={1200} rows={4} className="stroy-input mt-1 resize-y"/></Field>
      <Field label="Целевая ссылка" wide><input name="destinationUrl" type="url" required placeholder="https://..." className="stroy-input mt-1"/></Field>
      <p className="text-xs leading-5 text-muted-foreground md:col-span-2">Точная стоимость фиксируется в заказе по действующему тарифу. После создания содержание заказа становится финансовым и рекламным snapshot и не может незаметно измениться после оплаты.</p>
      <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground md:w-fit">Создать заказ</button>
    </form></section>}

    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><div><p className="text-sm font-semibold text-primary">История</p><h2 className="mt-1 text-2xl font-bold">Рекламные заказы</h2></div><div className="mt-5 space-y-4">{ordersResult.rows.map(order=><article key={order.id} className="rounded-2xl border border-border bg-background p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-xs font-semibold text-primary">{order.placement_name_snapshot}</p><h3 className="mt-1 text-lg font-bold">{order.title_snapshot}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{order.body_snapshot}</p><a href={order.destination_url_snapshot} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex break-all text-xs font-semibold text-primary">{order.destination_url_snapshot}</a></div><Status value={order.status}/></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><Metric label="Стоимость" value={money(order.amount_minor,order.currency)}/><Metric label="Срок" value={`${order.duration_days_snapshot} дн.`}/><Metric label="Показы" value={String(order.impressions)}/><Metric label="Клики" value={String(order.clicks)}/></div>{order.erid&&<p className="mt-3 break-all text-xs text-muted-foreground">erid: {order.erid} · ОРД: {order.ord_provider??"—"}</p>}{order.scheduled_from&&<p className="mt-2 text-xs text-muted-foreground">Период: {date(order.scheduled_from)} — {order.scheduled_to?date(order.scheduled_to):"—"}</p>}{order.rejection_reason&&<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Причина отклонения: {order.rejection_reason}</p>}<div className="mt-4 flex flex-wrap gap-2">{["draft","awaiting_payment"].includes(order.status)&&<form action={createAdCheckout}><input type="hidden" name="orderId" value={order.id}/><button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{order.status==="draft"?"Оплатить":"Продолжить оплату"}</button></form>}{["paid","rejected"].includes(order.status)&&<form action={submitAdForModeration}><input type="hidden" name="orderId" value={order.id}/><button className="rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary">Отправить на модерацию</button></form>}{order.status==="moderation"&&<span className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold"><Clock3 className="h-4 w-4"/>На модерации</span>}{order.status==="approved"&&<span className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold">Одобрено · ожидает ERID и расписание</span>}</div></article>)}{ordersResult.rows.length===0&&<div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Рекламных заказов пока нет.</div>}</div></section>
    <Link href="/contractor/dashboard" className="inline-flex text-sm font-semibold text-primary">← В кабинет подрядчика</Link>
  </div></main>;
}

function Field({label,children,wide=false}:{label:string;children:React.ReactNode;wide?:boolean}){return <label className={wide?"block md:col-span-2":"block"}><span className="text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>}
function Info({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>}
function Status({value}:{value:string}){const [label,cls]=status(value);return <span className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${cls}`}>{label}</span>}
function status(value:string):[string,string]{switch(value){case"verified":return["Проверен","bg-emerald-50 text-emerald-700"];case"pending":return["Ожидает проверки","bg-amber-50 text-amber-800"];case"draft":return["Черновик","bg-secondary text-foreground"];case"awaiting_payment":return["Ожидает оплату","bg-amber-50 text-amber-800"];case"paid":return["Оплачен","bg-blue-50 text-blue-800"];case"moderation":return["Модерация","bg-violet-50 text-violet-800"];case"approved":return["Одобрен","bg-emerald-50 text-emerald-800"];case"rejected":return["Отклонён","bg-red-50 text-red-800"];case"scheduled":return["Запланирован","bg-sky-50 text-sky-800"];case"active":return["Показывается","bg-emerald-50 text-emerald-800"];case"completed":return["Завершён","bg-secondary text-foreground"];case"suspended":return["Приостановлен","bg-orange-50 text-orange-800"];default:return[value,"bg-secondary text-foreground"]}}
function money(value:string|number,currency:string){return new Intl.NumberFormat("ru-RU",{style:"currency",currency,maximumFractionDigits:0}).format(Number(value)/100)}
function date(value:Date|string){return new Intl.DateTimeFormat("ru-RU",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Moscow"}).format(new Date(value))}
function errorMessage(value:string){switch(value){case"provider":return"YooKassa для рекламы пока не настроена.";case"verification":return"Рекламодатель должен быть проверен до создания и оплаты размещения.";case"placement":return"Выбранное рекламное место недоступно или срок не входит в тариф.";case"payment":return"Не удалось создать платёж рекламы.";case"moderation":return"Не удалось отправить заказ на модерацию.";default:return"Операция не выполнена. Проверьте данные и повторите попытку."}}
