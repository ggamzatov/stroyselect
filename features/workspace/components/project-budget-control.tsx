"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  FilePenLine,
  Receipt,
  XCircle,
} from "lucide-react";
import {
  cancelChangeOrder,
  createChangeOrder,
  decideChangeOrder,
  recordProjectPayment,
} from "@/features/workspace/actions/change-orders";

type Data = {
  role: "customer" | "contractor";
  project: {
    id: string;
    title: string;
    status: string;
    originalContract: number;
    approvedDelta: number;
    currentContract: number;
    paidTotal: number;
    remaining: number;
    originalDurationDays: number;
    currentDurationDays: number;
  };
  changes: Array<{
    id: string;
    requestedByCurrentUser: boolean;
    title: string;
    reason: string;
    scopeChange: string;
    amountDelta: number;
    durationDeltaDays: number;
    status: string;
    decisionComment: string | null;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    note: string | null;
  }>;
};

type Result = { success: boolean; message: string } | null;

export function ProjectBudgetControl({ data, backHref }: { data: Data; backHref: string }) {
  const [changeState, changeAction, changePending] = useActionState<Result, FormData>(
    async (_state, formData) => createChangeOrder(formData),
    null
  );
  const [paymentState, paymentAction, paymentPending] = useActionState<Result, FormData>(
    async (_state, formData) => recordProjectPayment(formData),
    null
  );
  const [decisionState, decisionAction, decisionPending] = useActionState<Result, FormData>(
    async (_state, formData) => decideChangeOrder(formData),
    null
  );
  const [cancelState, cancelAction] = useActionState<Result, FormData>(
    async (_state, formData) => cancelChangeOrder(formData),
    null
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link href={backHref} className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Вернуться в рабочее пространство
        </Link>

        <section className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <p className="text-sm font-semibold text-primary">Change Orders & Budget Control</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
            Бюджет и изменения проекта
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            {data.project.title}. Изменения цены и срока согласуются отдельно и фиксируются в истории проекта.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Banknote className="h-5 w-5" />} label="Исходный договор" value={money(data.project.originalContract)} />
          <Metric icon={<FilePenLine className="h-5 w-5" />} label="Согласованные изменения" value={signedMoney(data.project.approvedDelta)} />
          <Metric icon={<CircleDollarSign className="h-5 w-5" />} label="Текущая стоимость" value={money(data.project.currentContract)} />
          <Metric icon={<Receipt className="h-5 w-5" />} label="Осталось оплатить" value={money(data.project.remaining)} />
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-3">
          <MiniMetric label="Оплачено" value={money(data.project.paidTotal)} />
          <MiniMetric label="Исходный срок" value={`${data.project.originalDurationDays} дн.`} />
          <MiniMetric label="Текущий срок" value={`${data.project.currentDurationDays} дн.`} />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-border bg-card p-5 md:p-6">
              <h2 className="text-xl font-black text-foreground">Change orders</h2>
              <p className="mt-1 text-sm text-muted-foreground">Дополнительные работы, экономия бюджета и изменения сроков.</p>

              {data.changes.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-secondary/40 p-4 text-sm text-muted-foreground">Изменений пока нет.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {data.changes.map((change) => (
                    <article key={change.id} className="rounded-[1.25rem] border border-border bg-background/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Status status={change.status} />
                          <h3 className="mt-2 font-bold text-foreground">{change.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(change.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-foreground">{signedMoney(change.amountDelta)}</p>
                          <p className="text-xs text-muted-foreground">{signedDays(change.durationDeltaDays)}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Причина:</strong> {change.reason}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Изменение объёма:</strong> {change.scopeChange}</p>
                      {change.decisionComment && <p className="mt-3 rounded-xl bg-secondary/50 p-3 text-sm text-foreground">Комментарий: {change.decisionComment}</p>}

                      {change.status === "pending" && data.role === "customer" && (
                        <form action={decisionAction} className="mt-4 space-y-3">
                          <input type="hidden" name="projectId" value={data.project.id} />
                          <input type="hidden" name="changeOrderId" value={change.id} />
                          <textarea name="comment" placeholder="Комментарий к решению (необязательно)" className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                          <div className="flex gap-2">
                            <button disabled={decisionPending} name="decision" value="approved" className="min-h-10 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">Согласовать</button>
                            <button disabled={decisionPending} name="decision" value="rejected" className="min-h-10 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700">Отклонить</button>
                          </div>
                        </form>
                      )}

                      {change.status === "pending" && data.role === "contractor" && change.requestedByCurrentUser && (
                        <form action={cancelAction} className="mt-4">
                          <input type="hidden" name="projectId" value={data.project.id} />
                          <input type="hidden" name="changeOrderId" value={change.id} />
                          <button className="text-sm font-semibold text-red-600">Отменить запрос</button>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              )}
              <ActionMessage state={decisionState ?? cancelState} />
            </section>

            <section className="rounded-[1.75rem] border border-border bg-card p-5 md:p-6">
              <h2 className="text-xl font-black text-foreground">Платежи</h2>
              <div className="mt-5 space-y-3">
                {data.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Платежи ещё не зафиксированы.</p>
                ) : data.payments.map((payment) => (
                  <div key={payment.id} className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                    <div><p className="font-semibold text-foreground">{formatDate(payment.paidAt)}</p>{payment.note && <p className="mt-1 text-sm text-muted-foreground">{payment.note}</p>}</div>
                    <strong>{money(payment.amount)}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24">
            {data.role === "contractor" && (
              <section className="rounded-[1.75rem] border border-border bg-card p-5">
                <h2 className="font-black text-foreground">Запросить изменение</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Укажите причину, изменение стоимости и влияние на срок. Заказчик должен отдельно согласовать запрос.</p>
                <form action={changeAction} className="mt-4 space-y-3">
                  <input type="hidden" name="projectId" value={data.project.id} />
                  <Field name="title" placeholder="Например: дополнительная электрика" required />
                  <textarea name="reason" required placeholder="Почему возникло изменение" className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                  <textarea name="scopeChange" required placeholder="Что именно меняется в объёме работ" className="min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Field name="amountDelta" type="number" step="0.01" defaultValue="0" placeholder="Изменение ₽" required />
                    <Field name="durationDeltaDays" type="number" defaultValue="0" placeholder="Изменение дней" required />
                  </div>
                  <button disabled={changePending} className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Отправить на согласование</button>
                </form>
                <ActionMessage state={changeState} />
              </section>
            )}

            {data.role === "customer" && (
              <section className="rounded-[1.75rem] border border-border bg-card p-5">
                <h2 className="font-black text-foreground">Зафиксировать платёж</h2>
                <form action={paymentAction} className="mt-4 space-y-3">
                  <input type="hidden" name="projectId" value={data.project.id} />
                  <Field name="amount" type="number" step="0.01" min="0.01" placeholder="Сумма ₽" required />
                  <Field name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                  <textarea name="note" placeholder="Комментарий" className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                  <button disabled={paymentPending} className="min-h-11 w-full rounded-xl border border-border bg-secondary px-4 text-sm font-bold text-foreground">Добавить платёж</button>
                </form>
                <ActionMessage state={paymentState} />
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-[1.5rem] border border-border bg-card p-5"><div className="text-primary">{icon}</div><p className="mt-4 text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-2 text-xl font-black text-foreground">{value}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold text-foreground">{value}</p></div>;
}

function Status({ status }: { status: string }) {
  const config = status === "approved"
    ? { label: "Согласовано", icon: <BadgeCheck className="h-3.5 w-3.5" />, className: "bg-emerald-50 text-emerald-700" }
    : status === "rejected"
      ? { label: "Отклонено", icon: <XCircle className="h-3.5 w-3.5" />, className: "bg-red-50 text-red-700" }
      : status === "cancelled"
        ? { label: "Отменено", icon: <XCircle className="h-3.5 w-3.5" />, className: "bg-secondary text-muted-foreground" }
        : { label: "На согласовании", icon: <CalendarClock className="h-3.5 w-3.5" />, className: "bg-amber-50 text-amber-700" };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${config.className}`}>{config.icon}{config.label}</span>;
}

function ActionMessage({ state }: { state: Result }) {
  if (!state) return null;
  return <p className={`mt-3 rounded-xl p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{state.message}</p>;
}

function money(value: number) { return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`; }
function signedMoney(value: number) { return `${value > 0 ? "+" : ""}${money(value)}`; }
function signedDays(value: number) { return `${value > 0 ? "+" : ""}${value} дн.`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
