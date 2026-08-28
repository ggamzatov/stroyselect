import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  PackageCheck,
  ReceiptText,
  Truck,
} from "lucide-react";
import { redirect } from "next/navigation";

import { createMaterialOrder, createMaterialOrderCheckout } from "@/features/materials/actions/material-order";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { db } from "@/lib/db/pool";
import { getMaterialProjectParticipant } from "@/lib/materials/get-material-project-participant";

type Role = "customer" | "contractor";
type ListRow = { id: string; status: string; selected_quote_id: string | null };
type OrderRow = {
  id: string;
  status: string;
  goods_subtotal_minor: string | number;
  currency: string;
  supplier_name_snapshot: string;
  platform_commission_minor: string | number;
  supplier_net_minor: string | number;
  ordered_at: Date | string;
  paid_at: Date | string | null;
};
type PaymentRow = { status: string; created_at: Date | string; paid_at: Date | string | null };
type Props = {
  projectId: string;
  role: Role;
  query: Record<string, string | string[] | undefined>;
};

const paidStatuses = new Set([
  "paid",
  "supplier_confirmed",
  "delivery_pending",
  "in_delivery",
  "delivered",
  "completed",
]);

export async function MaterialOrderPanel({ projectId, role, query }: Props) {
  const activeUser = await requireActiveUser();
  if (!activeUser.success) redirect("/login");
  if (activeUser.profile.role !== role) redirect("/dashboard");

  const ctx = await getMaterialProjectParticipant(
    projectId,
    activeUser.user.id,
    activeUser.profile.role
  );
  if (!ctx.success) return null;

  const listResult = await db.query<ListRow>(
    `SELECT id,status,selected_quote_id FROM public.project_material_lists WHERE project_id=$1::uuid ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  );
  const list = listResult.rows[0];
  if (!list || !["selected", "ordered"].includes(list.status)) return null;

  const orderResult = await db.query<OrderRow>(
    `
      SELECT id,status,goods_subtotal_minor,currency,supplier_name_snapshot,platform_commission_minor,supplier_net_minor,ordered_at,paid_at
      FROM public.material_orders WHERE list_id=$1::uuid LIMIT 1
    `,
    [list.id]
  );
  const order = orderResult.rows[0] ?? null;
  const paymentResult = order
    ? await db.query<PaymentRow>(
        `SELECT status,created_at,paid_at FROM public.material_order_payments WHERE order_id=$1::uuid ORDER BY created_at DESC LIMIT 1`,
        [order.id]
      )
    : { rows: [] as PaymentRow[] };
  const payment = paymentResult.rows[0] ?? null;
  const customer = role === "customer";
  const notice =
    query.order === "created"
      ? "Заказ создан. Сумма зафиксирована по выбранному предложению."
      : query.order === "existing"
        ? "Заказ уже был создан ранее."
        : query.payment === "return"
          ? "Вы вернулись из кассы. Оплата считается подтверждённой только после серверного уведомления ЮKassa."
          : query.payment === "confirmed"
            ? "Оплата заказа подтверждена."
            : query.order_error
              ? errorMessage(String(query.order_error))
              : null;

  if (!order) {
    return (
      <section className="app-container pb-8" aria-labelledby="material-order-heading">
        <div className="ui-v2-panel overflow-hidden p-5 sm:p-6 lg:p-7">
          <PurchaseRail current="order" />

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                <PackageCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Следующее действие</p>
                <h2 id="material-order-heading" className="mt-1 text-xl font-black tracking-[-0.025em] text-foreground sm:text-2xl">
                  Оформить заказ по выбранному предложению
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Цены и позиции выбранного поставщика будут зафиксированы в неизменяемом заказе. Стоимость доставки рассчитывается отдельно и не входит в сумму товаров.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/40 p-4">
              <p className="text-xs font-semibold text-muted-foreground">Что произойдёт дальше</p>
              <p className="mt-1 text-sm font-bold text-foreground">Заказ → оплата → расчёт доставки</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Оплата подтверждается только серверным уведомлением платёжного провайдера.
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            {customer && list.selected_quote_id ? (
              <form action={createMaterialOrder}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="listId" value={list.id} />
                <input type="hidden" name="quoteId" value={list.selected_quote_id} />
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)]">
                  Оформить заказ
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Заказ оформляет заказчик проекта.</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  const paymentConfirmed = paidStatuses.has(order.status);

  return (
    <section className="app-container pb-8" aria-labelledby="material-order-heading">
      <div className="ui-v2-panel overflow-hidden p-5 sm:p-6 lg:p-7">
        {notice ? (
          <div className="mb-5 rounded-xl border border-border bg-secondary/55 px-4 py-3 text-sm font-semibold text-foreground" aria-live="polite">
            {notice}
          </div>
        ) : null}

        <PurchaseRail current={paymentConfirmed ? "delivery" : "payment"} />

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <ReceiptText className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Заказ материалов</p>
                <StatusBadge status={order.status} />
              </div>
              <h2 id="material-order-heading" className="mt-1 break-words text-2xl font-black tracking-[-0.03em] text-foreground sm:text-3xl">
                {order.supplier_name_snapshot}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">Создан {dateTime(order.ordered_at)}</p>
            </div>
          </div>

          <div className="min-w-[220px] rounded-2xl bg-secondary/60 px-5 py-4 lg:text-right">
            <p className="text-xs font-semibold text-muted-foreground">К оплате за товары</p>
            <p className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground">
              {money(order.goods_subtotal_minor, order.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Доставка рассчитывается отдельно</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <FinanceCard
            icon={<CircleDollarSign className="h-4 w-4" />}
            label="Стоимость товаров"
            value={money(order.goods_subtotal_minor, order.currency)}
            description="Зафиксирована из выбранного предложения"
          />
          <FinanceCard
            icon={<CreditCard className="h-4 w-4" />}
            label="Комиссия платформы"
            value={money(order.platform_commission_minor, order.currency)}
            description="Учитывается в расчёте с поставщиком"
          />
          <FinanceCard
            icon={<Truck className="h-4 w-4" />}
            label="Поставщику"
            value={money(order.supplier_net_minor, order.currency)}
            description="Без стоимости отдельной доставки"
          />
        </div>

        {order.status === "awaiting_payment" ? (
          <div className="mt-6 rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,var(--secondary),var(--card))] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Следующее действие</p>
                <h3 className="mt-1 text-lg font-black text-foreground">Оплатить заказ материалов</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  После подтверждения оплаты станет доступен расчёт доставки на объект.
                </p>
              </div>
              {customer ? (
                <form action={createMaterialOrderCheckout}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)] sm:w-auto">
                    Перейти к оплате
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">Ожидается оплата заказчиком.</p>
              )}
            </div>

            {payment?.status === "pending" ? (
              <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                Платёж уже создан в ЮKassa. Повторное нажатие продолжит тот же платёж и не создаст дубль.
              </p>
            ) : null}
          </div>
        ) : null}

        {paymentConfirmed ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/75">
              <BadgeCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">Оплата подтверждена сервером</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                {order.paid_at ? `Подтверждено ${dateTime(order.paid_at)}. ` : ""}Теперь логистика заказа может быть рассчитана отдельно.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PurchaseRail({ current }: { current: "order" | "payment" | "delivery" }) {
  const currentIndex = { order: 1, payment: 2, delivery: 3 }[current];
  const steps = [
    { label: "Предложение", icon: CheckCircle2 },
    { label: "Заказ", icon: PackageCheck },
    { label: "Оплата", icon: CreditCard },
    { label: "Доставка", icon: Truck },
  ];

  return (
    <div className="overflow-x-auto pb-1" aria-label="Этапы закупки материалов">
      <div className="flex min-w-[520px] items-center">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const completed = index < currentIndex;
          const active = index === currentIndex;
          return (
            <div key={step.label} className="flex min-w-0 flex-1 items-center last:flex-none">
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs",
                    completed || active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className={active ? "text-xs font-bold text-foreground" : "text-xs font-semibold text-muted-foreground"}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <span className={[
                  "mx-3 h-px min-w-5 flex-1",
                  index < currentIndex ? "bg-primary/55" : "bg-border",
                ].join(" ")} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinanceCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/55 p-4">
      <div className="flex items-center gap-2 text-primary" aria-hidden="true">{icon}</div>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-black text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
      {statusLabel(status)}
    </span>
  );
}

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) / 100);
}

function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    awaiting_payment: "Ожидает оплаты",
    paid: "Оплачен",
    supplier_confirmed: "Подтверждён поставщиком",
    delivery_pending: "Ожидает доставки",
    in_delivery: "В доставке",
    delivered: "Доставлен",
    completed: "Завершён",
    cancelled: "Отменён",
    refunded: "Возврат",
  };
  return labels[status] ?? status;
}

function errorMessage(code: string) {
  const messages: Record<string, string> = {
    status: "На текущем статусе проекта заказ нельзя оплачивать.",
    quote: "Выбранное предложение недоступно или срок цены истёк.",
    incomplete: "Предложение неполное — заказ не создан.",
    create: "Не удалось оформить заказ.",
    provider: "ЮKassa ещё не настроена администратором.",
    origin: "Не удалось определить адрес возврата после оплаты.",
    payment: "Не удалось создать платёж.",
    confirmation: "ЮKassa не вернула страницу подтверждения.",
    payment_state: "Заказ сейчас нельзя оплачивать.",
  };
  return messages[code] ?? "Операция заказа не выполнена.";
}
