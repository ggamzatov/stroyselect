import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Eye,
  Megaphone,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  createAdCheckout,
  createAdDraft,
  saveAdAdvertiser,
  submitAdForModeration,
} from "@/features/ads/actions/advertising";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { db } from "@/lib/db/pool";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Company = {
  id: string;
  public_name: string;
  legal_name: string | null;
  inn: string | null;
  ogrn: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  verification_status: string;
};

type Advertiser = {
  id: string;
  display_name: string;
  legal_name: string;
  inn: string;
  ogrn: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  verification_notes: string | null;
};

type Placement = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit_price_minor: string | number;
  currency: string;
  min_days: number;
  max_days: number;
};

type Order = {
  id: string;
  status: string;
  amount_minor: string | number;
  currency: string;
  duration_days_snapshot: number;
  placement_name_snapshot: string;
  title_snapshot: string;
  body_snapshot: string;
  destination_url_snapshot: string;
  created_at: Date | string;
  scheduled_from: Date | string | null;
  scheduled_to: Date | string | null;
  rejection_reason: string | null;
  creative_status: string;
  erid: string | null;
  ord_provider: string | null;
  payment_status: string | null;
  impressions: string | number;
  clicks: string | number;
};

export default async function ContractorAdvertisingPage({ searchParams }: Props) {
  const [activeUser, query] = await Promise.all([requireActiveUser(), searchParams]);
  if (!activeUser.success) redirect("/login");
  if (activeUser.profile.role !== "contractor") redirect("/dashboard");

  const companyResult = await db.query<Company>(
    `SELECT id,public_name,legal_name,inn,ogrn,website,contact_email,contact_phone,verification_status FROM public.contractor_companies WHERE owner_id=$1::uuid LIMIT 1`,
    [activeUser.user.id]
  );
  const company = companyResult.rows[0];
  if (!company) redirect("/contractor/company");

  const [advertiserResult, placementsResult, ordersResult] = await Promise.all([
    db.query<Advertiser>(
      `SELECT id,display_name,legal_name,inn,ogrn,website_url,contact_email,contact_phone,status,verification_notes FROM public.ad_advertisers WHERE owner_user_id=$1::uuid LIMIT 1`,
      [activeUser.user.id]
    ),
    db.query<Placement>(
      `SELECT id,code,name,description,unit_price_minor,currency,min_days,max_days FROM public.ad_placements WHERE is_active=true AND code<>'supplier_boost' ORDER BY sort_order,name`
    ),
    db.query<Order>(
      `
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
      `,
      [activeUser.user.id]
    ),
  ]);

  const advertiser = advertiserResult.rows[0] ?? null;
  const orders = ordersResult.rows;
  const totalImpressions = orders.reduce((sum, order) => sum + Number(order.impressions), 0);
  const totalClicks = orders.reduce((sum, order) => sum + Number(order.clicks), 0);
  const activeOrders = orders.filter((order) => ["scheduled", "active"].includes(order.status)).length;

  const message = query.created
    ? "Рекламный заказ создан. Оплата не запускает показ автоматически."
    : query.moderation
      ? "Оплаченный креатив отправлен на модерацию."
      : query.payment
        ? "Возврат из YooKassa выполнен. Статус оплаты подтверждается только серверным webhook."
        : query.saved
          ? "Данные рекламодателя сохранены."
          : query.error
            ? errorMessage(String(query.error))
            : null;

  return (
    <main className="min-h-screen bg-background">
      <div className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
        <div className="mx-auto max-w-[1420px] space-y-5">
          <section className="ui-v2-panel overflow-hidden p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                  <Megaphone className="h-4 w-4" aria-hidden="true" />
                  Коммерческое продвижение
                </div>
                <h1 className="mt-4 text-2xl font-black tracking-[-0.035em] sm:text-3xl lg:text-4xl">
                  Реклама в StroySelect
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Создавайте отдельные рекламные размещения. Спонсорские блоки всегда
                  помечаются как реклама и не меняют органический matching, рейтинг или порядок
                  обычной выдачи.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px]">
                <Kpi label="Активные размещения" value={String(activeOrders)} icon={<Sparkles className="h-4 w-4" />} />
                <Kpi label="Показы" value={totalImpressions.toLocaleString("ru-RU")} icon={<Eye className="h-4 w-4" />} />
                <Kpi label="Клики" value={totalClicks.toLocaleString("ru-RU")} icon={<MousePointerClick className="h-4 w-4" />} />
              </div>
            </div>
          </section>

          {message ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm font-semibold shadow-[var(--shadow-soft)]">
              {message}
            </div>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-3" aria-label="Как работает реклама">
            <Info step="1" icon={<CircleDollarSign className="h-5 w-5" />} title="Оплата" text="YooKassa подтверждает оплату серверным webhook. Возврат из браузера не даёт рекламных прав." />
            <Info step="2" icon={<ShieldCheck className="h-5 w-5" />} title="Модерация" text="После оплаты креатив отдельно проходит модерацию. Оплаченный заказ не публикуется автоматически." />
            <Info step="3" icon={<BadgeCheck className="h-5 w-5" />} title="ЕРИР / ERID" text="Перед показом администратор фиксирует ERID и оператора рекламных данных. Без этого база не разрешит активацию." />
          </section>

          <section className="ui-v2-panel p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Шаг 1</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Рекламодатель</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Реквизиты используются для проверки рекламодателя и последующей маркировки.</p>
              </div>
              {advertiser ? <Status value={advertiser.status} /> : null}
            </div>

            <form action={saveAdAdvertiser} className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Название в рекламе"><input name="displayName" required maxLength={200} defaultValue={advertiser?.display_name ?? company.public_name} className="stroy-input" /></Field>
              <Field label="Юридическое наименование"><input name="legalName" required maxLength={240} defaultValue={advertiser?.legal_name ?? company.legal_name ?? ""} className="stroy-input" /></Field>
              <Field label="ИНН"><input name="inn" inputMode="numeric" required defaultValue={advertiser?.inn ?? company.inn ?? ""} className="stroy-input" /></Field>
              <Field label="ОГРН / ОГРНИП"><input name="ogrn" inputMode="numeric" defaultValue={advertiser?.ogrn ?? company.ogrn ?? ""} className="stroy-input" /></Field>
              <Field label="Сайт рекламодателя"><input name="websiteUrl" type="url" defaultValue={advertiser?.website_url ?? company.website ?? ""} placeholder="https://example.ru" className="stroy-input" /></Field>
              <Field label="Email"><input name="contactEmail" type="email" defaultValue={advertiser?.contact_email ?? company.contact_email ?? ""} className="stroy-input" /></Field>
              <Field label="Телефон"><input name="contactPhone" defaultValue={advertiser?.contact_phone ?? company.contact_phone ?? ""} className="stroy-input" /></Field>

              <label className="flex items-start gap-3 rounded-2xl border border-border bg-background/70 p-4 text-sm leading-6 md:col-span-2">
                <input name="legalConfirmed" type="checkbox" required defaultChecked={Boolean(advertiser)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]" />
                <span>Подтверждаю достоверность реквизитов, законность рекламируемого объекта и целевой страницы, а также то, что реклама не ведёт на ресурс, размещение рекламы на котором запрещено законодательством РФ.</span>
              </label>

              <button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground md:w-fit">Сохранить рекламодателя</button>
            </form>

            {advertiser?.verification_notes ? <p className="mt-4 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">Комментарий проверки: {advertiser.verification_notes}</p> : null}
          </section>

          {advertiser?.status === "verified" ? (
            <section className="ui-v2-panel p-5 sm:p-6 lg:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Шаг 2</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">Создать рекламный заказ</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Стоимость и содержимое фиксируются snapshot-ом в момент создания заказа.</p>
                </div>
                <span className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-primary">{placementsResult.rows.length} доступных размещений</span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {placementsResult.rows.map((placement) => (
                  <div key={placement.id} className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-sm font-bold">{placement.name}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{placement.description || "Спонсорское размещение внутри StroySelect"}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-primary">{money(placement.unit_price_minor, placement.currency)}/день</span>
                      <span className="text-muted-foreground">{placement.min_days}–{placement.max_days} дн.</span>
                    </div>
                  </div>
                ))}
              </div>

              <form action={createAdDraft} className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Название кампании"><input name="campaignName" required maxLength={200} placeholder="Например: Продвижение ремонта квартир" className="stroy-input" /></Field>
                <Field label="Место размещения"><select name="placementId" required className="stroy-select"><option value="">Выберите размещение</option>{placementsResult.rows.map((placement) => <option key={placement.id} value={placement.id}>{placement.name} — {money(placement.unit_price_minor, placement.currency)}/день</option>)}</select></Field>
                <Field label="Количество дней"><input name="durationDays" type="number" min="1" max="90" defaultValue="7" required className="stroy-input" /></Field>
                <Field label="Целевой город — необязательно"><input name="targetCity" maxLength={160} placeholder="Махачкала" className="stroy-input" /></Field>
                <Field label="Slug категории — необязательно"><input name="targetCategory" maxLength={160} placeholder="general-construction" className="stroy-input" /></Field>
                <Field label="Заголовок"><input name="title" required maxLength={180} className="stroy-input" /></Field>
                <Field label="Текст рекламы" wide><textarea name="body" required maxLength={1200} rows={4} className="stroy-textarea resize-y" /></Field>
                <Field label="Целевая ссылка" wide><input name="destinationUrl" type="url" required placeholder="https://..." className="stroy-input" /></Field>
                <p className="rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground md:col-span-2">Точная стоимость фиксируется в заказе по действующему тарифу. После создания содержание заказа становится финансовым и рекламным snapshot и не может незаметно измениться после оплаты.</p>
                <button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground md:w-fit">Создать заказ</button>
              </form>
            </section>
          ) : (
            <section className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff2dc] text-[#a85f00]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
                <div><h2 className="text-lg font-black">Создание заказа откроется после проверки</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Сохраните данные рекламодателя и дождитесь статуса «Проверен».</p></div>
              </div>
            </section>
          )}

          <section className="ui-v2-panel p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Шаг 3</p><h2 className="mt-1 text-2xl font-black tracking-tight">Рекламные заказы</h2><p className="mt-2 text-sm text-muted-foreground">Оплата, модерация, ERID, расписание и фактическая статистика показов.</p></div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />Всего заказов: {orders.length}</div>
            </div>

            <div className="mt-5 space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><p className="text-xs font-semibold text-primary">{order.placement_name_snapshot}</p><h3 className="mt-1 text-lg font-black">{order.title_snapshot}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{order.body_snapshot}</p><a href={order.destination_url_snapshot} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex max-w-full break-all text-xs font-semibold text-primary">{order.destination_url_snapshot}</a></div>
                    <Status value={order.status} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Стоимость" value={money(order.amount_minor, order.currency)} /><Metric label="Срок" value={`${order.duration_days_snapshot} дн.`} /><Metric label="Показы" value={String(order.impressions)} /><Metric label="Клики" value={String(order.clicks)} /></div>

                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground lg:grid-cols-2">
                    {order.erid ? <p className="break-all rounded-xl bg-card p-3">erid: {order.erid} · ОРД: {order.ord_provider ?? "—"}</p> : null}
                    {order.scheduled_from ? <p className="rounded-xl bg-card p-3">Период: {date(order.scheduled_from)} — {order.scheduled_to ? date(order.scheduled_to) : "—"}</p> : null}
                  </div>

                  {order.rejection_reason ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Причина отклонения: {order.rejection_reason}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    {["draft", "awaiting_payment"].includes(order.status) ? <form action={createAdCheckout}><input type="hidden" name="orderId" value={order.id} /><button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{order.status === "draft" ? "Оплатить" : "Продолжить оплату"}</button></form> : null}
                    {["paid", "rejected"].includes(order.status) ? <form action={submitAdForModeration}><input type="hidden" name="orderId" value={order.id} /><button className="rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary">Отправить на модерацию</button></form> : null}
                    {order.status === "moderation" ? <span className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold"><Clock3 className="h-4 w-4" aria-hidden="true" />На модерации</span> : null}
                    {order.status === "approved" ? <span className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold">Одобрено · ожидает ERID и расписание</span> : null}
                  </div>
                </article>
              ))}

              {orders.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><Megaphone className="mx-auto h-6 w-6 text-primary" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">Рекламных заказов пока нет.</p><p className="mt-1 text-xs text-muted-foreground">После проверки рекламодателя создайте первое размещение выше.</p></div> : null}
            </div>
          </section>

          <Link href="/contractor/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary">В кабинет подрядчика<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "block md:col-span-2" : "block"}><span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>{children}</label>;
}

function Info({ step, icon, title, text }: { step: string; icon: React.ReactNode; title: string; text: string }) {
  return <div className="ui-v2-panel p-5"><div className="flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div><span className="text-xs font-black text-muted-foreground">0{step}</span></div><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-background/70 p-4"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div><p className="mt-3 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function Status({ value }: { value: string }) {
  const [label, className] = status(value);
  return <span className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${className}`}>{label}</span>;
}

function status(value: string): [string, string] {
  switch (value) {
    case "verified": return ["Проверен", "bg-emerald-50 text-emerald-700"];
    case "pending": return ["Ожидает проверки", "bg-amber-50 text-amber-800"];
    case "draft": return ["Черновик", "bg-secondary text-foreground"];
    case "awaiting_payment": return ["Ожидает оплату", "bg-amber-50 text-amber-800"];
    case "paid": return ["Оплачен", "bg-blue-50 text-blue-800"];
    case "moderation": return ["Модерация", "bg-violet-50 text-violet-800"];
    case "approved": return ["Одобрен", "bg-emerald-50 text-emerald-800"];
    case "rejected": return ["Отклонён", "bg-red-50 text-red-800"];
    case "scheduled": return ["Запланирован", "bg-sky-50 text-sky-800"];
    case "active": return ["Показывается", "bg-emerald-50 text-emerald-800"];
    case "completed": return ["Завершён", "bg-secondary text-foreground"];
    case "suspended": return ["Приостановлен", "bg-orange-50 text-orange-800"];
    default: return [value, "bg-secondary text-foreground"];
  }
}

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value) / 100);
}

function date(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" }).format(new Date(value));
}

function errorMessage(value: string) {
  switch (value) {
    case "provider": return "YooKassa для рекламы пока не настроена.";
    case "verification": return "Рекламодатель должен быть проверен до создания и оплаты размещения.";
    case "placement": return "Выбранное рекламное место недоступно или срок не входит в тариф.";
    case "payment": return "Не удалось создать платёж рекламы.";
    case "moderation": return "Не удалось отправить заказ на модерацию.";
    default: return "Операция не выполнена. Проверьте данные и повторите попытку.";
  }
}
