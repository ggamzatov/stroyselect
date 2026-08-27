"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FilePenLine,
  Receipt,
  ShieldAlert,
  WalletCards,
  XCircle,
} from "lucide-react";

import { StagePaymentButton } from "@/features/payments/components/stage-payment-button";
import {
  cancelChangeOrder,
  createChangeOrder,
  decideChangeOrder,
  recordProjectPayment,
} from "@/features/workspace/actions/change-orders";
import {
  cancelProjectPaymentConfirmation,
  confirmProjectPayment,
  disputeProjectPayment,
} from "@/features/workspace/actions/payment-confirmations";

type Intent = {
  id: string;
  amount: number;
  status: string;
  provider: string;
  providerStatus: string | null;
  confirmationUrl: string | null;
  fundedAt: string | null;
  releaseReadyAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  failureReason: string | null;
};
type Stage = {
  id: string;
  title: string;
  status: string;
  sortOrder: number;
  progressWeight: number;
  stagePrice: number;
  paymentDuePercent: number | null;
  paymentDueAmount: number | null;
  plannedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentProgress: number;
  paymentIntent: Intent | null;
};
type Payment = {
  id: string;
  stageId: string | null;
  amount: number;
  paidAt: string;
  note: string | null;
  confirmationStatus: string;
  customerConfirmedAt: string | null;
  contractorConfirmedAt: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
  cancellationReason: string | null;
  currentUserConfirmed: boolean;
};
type Change = {
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
};
type Data = {
  role: "customer" | "contractor";
  paymentsEnabled: boolean;
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
  stages: Stage[];
  changes: Change[];
  payments: Payment[];
  paymentIntents: Intent[];
};
type Result = { success: boolean; message: string } | null;
type OperationKeys = { changeOrder: string; payment: string };

export function ProjectBudgetControlV2({
  data,
  backHref,
  operationKeys,
}: {
  data: Data;
  backHref: string;
  operationKeys: OperationKeys;
}) {
  const [changeKey, setChangeKey] = useState(operationKeys.changeOrder);
  const [paymentKey, setPaymentKey] = useState(operationKeys.payment);
  const [changeState, changeAction, changePending] = useActionState<Result, FormData>(
    async (_, form) => {
      const result = await createChangeOrder(form);
      if (result.success) setChangeKey(crypto.randomUUID());
      return result;
    },
    null
  );
  const [paymentState, paymentAction, paymentPending] = useActionState<Result, FormData>(
    async (_, form) => {
      const result = await recordProjectPayment(form);
      if (result.success) setPaymentKey(crypto.randomUUID());
      return result;
    },
    null
  );
  const [decisionState, decisionAction, decisionPending] = useActionState<Result, FormData>(
    async (_, form) => decideChangeOrder(form),
    null
  );
  const [cancelState, cancelAction] = useActionState<Result, FormData>(
    async (_, form) => cancelChangeOrder(form),
    null
  );

  const paidPercent =
    data.project.currentContract > 0
      ? Math.min(100, Math.round((data.project.paidTotal / data.project.currentContract) * 100))
      : 0;

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <Link
          href={backHref}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          ← Вернуться в рабочее пространство
        </Link>

        <section className="ui-v2-panel mt-4 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <WalletCards className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Финансы проекта</p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
                    Бюджет и платежи
                  </h1>
                </div>
              </div>
              <p className="mt-4 break-words text-sm leading-6 text-muted-foreground sm:text-base">
                {data.project.title}.{" "}
                {data.paymentsEnabled
                  ? "Оплата проводится по этапам через ЮKassa. Деньги становятся доступными подрядчику только после явной приёмки этапа заказчиком."
                  : "Онлайн-платежи пока отключены. Для тестового/переходного режима доступен ручной учёт только уже принятых этапов."}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-border bg-background/70 p-4 sm:min-w-[310px]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Оплачено по договору</p>
                  <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-foreground">{paidPercent}%</p>
                </div>
                <span
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    data.paymentsEnabled
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-secondary text-primary",
                  ].join(" ")}
                >
                  {data.paymentsEnabled ? "ЮKassa включена" : "Ручной режим"}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${paidPercent}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Финансовая сводка">
          <Metric icon={<Banknote className="h-5 w-5" />} label="Стоимость по договору" value={money(data.project.originalContract)} />
          <Metric icon={<FilePenLine className="h-5 w-5" />} label="Согласованные изменения" value={signedMoney(data.project.approvedDelta)} />
          <Metric icon={<CircleDollarSign className="h-5 w-5" />} label="Текущая стоимость" value={money(data.project.currentContract)} />
          <Metric icon={<Receipt className="h-5 w-5" />} label="Заказчику осталось внести" value={money(data.project.remaining)} emphasized />
        </section>

        <section className="ui-v2-panel mt-5 p-4 sm:p-5 lg:p-6" aria-labelledby="stage-payments-title">
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="stage-payments-title" className="text-lg font-black text-foreground sm:text-xl">Расчёты по этапам</h2>
              <p className="mt-1 text-sm text-muted-foreground">Каждый этап имеет самостоятельный статус денег и приёмки.</p>
            </div>
            <span className="w-fit rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
              {data.stages.length} этапов
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {data.stages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-10 text-center text-sm text-muted-foreground">
                Этапы ещё не сформированы.
              </div>
            ) : (
              data.stages.map((stage) => (
                <StagePaymentCard
                  key={stage.id}
                  stage={stage}
                  projectId={data.project.id}
                  role={data.role}
                  paymentsEnabled={data.paymentsEnabled}
                />
              ))
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <section className="ui-v2-panel p-4 sm:p-5 lg:p-6" aria-labelledby="change-orders-title">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 id="change-orders-title" className="text-lg font-black text-foreground sm:text-xl">Изменения к договору</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Стоимость и срок меняются только после согласования.</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">{data.changes.length}</span>
              </div>

              <div className="mt-4 space-y-3">
                {data.changes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-9 text-center text-sm text-muted-foreground">
                    Согласованных или ожидающих изменений нет.
                  </div>
                ) : (
                  data.changes.map((change) => (
                    <article key={change.id} className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <Status status={change.status} />
                          <h3 className="mt-2 break-words font-black text-foreground">{change.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(change.createdAt)}</p>
                        </div>
                        <strong className="shrink-0 text-lg text-foreground">{signedMoney(change.amountDelta)}</strong>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-xl bg-card p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Причина</p>
                          <p className="mt-1 break-words leading-5 text-foreground">{change.reason}</p>
                        </div>
                        <div className="rounded-xl bg-card p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Что меняется</p>
                          <p className="mt-1 break-words leading-5 text-foreground">{change.scopeChange}</p>
                        </div>
                      </div>

                      {change.durationDeltaDays !== 0 ? (
                        <p className="mt-3 text-xs font-semibold text-muted-foreground">
                          Изменение срока: {change.durationDeltaDays > 0 ? "+" : ""}{change.durationDeltaDays} дн.
                        </p>
                      ) : null}
                      {change.decisionComment ? (
                        <p className="mt-2 break-words text-xs text-muted-foreground">Комментарий: {change.decisionComment}</p>
                      ) : null}

                      {change.status === "pending" && data.role === "customer" ? (
                        <form action={decisionAction} className="mt-4 space-y-3 border-t border-border pt-4">
                          <input type="hidden" name="projectId" value={data.project.id} />
                          <input type="hidden" name="changeOrderId" value={change.id} />
                          <label className="block text-xs font-bold text-foreground">
                            Комментарий к решению
                            <textarea
                              name="comment"
                              className="stroy-textarea mt-2 min-h-20"
                              placeholder="При необходимости добавьте пояснение"
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={decisionPending}
                              name="decision"
                              value="approved"
                              className="min-h-10 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
                            >
                              Согласовать
                            </button>
                            <button
                              disabled={decisionPending}
                              name="decision"
                              value="rejected"
                              className="min-h-10 rounded-xl border border-red-200 bg-card px-4 text-xs font-bold text-red-700"
                            >
                              Отклонить
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {change.status === "pending" && data.role === "contractor" && change.requestedByCurrentUser ? (
                        <form action={cancelAction} className="mt-4 border-t border-border pt-4">
                          <input type="hidden" name="projectId" value={data.project.id} />
                          <input type="hidden" name="changeOrderId" value={change.id} />
                          <button className="min-h-9 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600">
                            Отменить запрос
                          </button>
                        </form>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
              <ActionMessage state={decisionState ?? cancelState} />
            </section>

            {data.payments.length > 0 ? (
              <section className="ui-v2-panel p-4 sm:p-5 lg:p-6" aria-labelledby="manual-payments-title">
                <div className="border-b border-border pb-4">
                  <h2 id="manual-payments-title" className="text-lg font-black text-foreground sm:text-xl">Ручные записи платежей</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Архив переходного режима. Онлайн-платежи ЮKassa отображаются непосредственно у соответствующего этапа.
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {data.payments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      projectId={data.project.id}
                      role={data.role}
                      stageTitle={payment.stageId ? data.stages.find((stage) => stage.id === payment.stageId)?.title : null}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            {data.role === "contractor" ? (
              <section className="ui-v2-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <FilePenLine className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-black text-foreground">Запросить изменение договора</h2>
                    <p className="text-xs text-muted-foreground">Отправить заказчику на согласование</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Стоимость или срок меняются только после согласования заказчиком.
                </p>
                <form action={changeAction} className="mt-4 space-y-3">
                  <input type="hidden" name="projectId" value={data.project.id} />
                  <input type="hidden" name="idempotencyKey" value={changeKey} />
                  <Field name="title" placeholder="Название изменения" required />
                  <textarea name="reason" required placeholder="Почему изменение необходимо" className="stroy-textarea min-h-20" />
                  <textarea name="scopeChange" required placeholder="Что именно меняется" className="stroy-textarea min-h-24" />
                  <Field name="amountDelta" type="number" step="0.01" defaultValue="0" required />
                  <Field name="durationDeltaDays" type="number" defaultValue="0" required />
                  <button
                    disabled={changePending}
                    className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-[#076c47]"
                  >
                    Отправить на согласование
                  </button>
                </form>
                <ActionMessage state={changeState} />
              </section>
            ) : null}

            {data.role === "customer" && !data.paymentsEnabled ? (
              <section className="ui-v2-panel p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Receipt className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-black text-foreground">Ручной учёт принятого этапа</h2>
                    <p className="text-xs text-muted-foreground">Переходный режим расчётов</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Доступен только пока платёжный провайдер отключён. Записать можно только выплату по этапу, уже принятому заказчиком.
                </p>
                <form action={paymentAction} className="mt-4 space-y-3">
                  <input type="hidden" name="projectId" value={data.project.id} />
                  <input type="hidden" name="idempotencyKey" value={paymentKey} />
                  <label className="block text-xs font-bold text-foreground">
                    Принятый этап
                    <select name="stageId" required className="stroy-input mt-2">
                      <option value="">Выберите принятый этап</option>
                      {data.stages
                        .filter((stage) => stage.status === "completed" && stage.remainingAmount > 0)
                        .map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.title} — {money(stage.remainingAmount)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={data.project.remaining}
                    placeholder="Сумма, ₽"
                    required
                  />
                  <Field name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                  <textarea name="note" placeholder="Комментарий" className="stroy-textarea min-h-20" />
                  <button
                    disabled={paymentPending}
                    className="min-h-11 w-full rounded-xl bg-secondary px-4 text-sm font-bold text-primary transition hover:bg-accent"
                  >
                    Добавить запись
                  </button>
                </form>
                <ActionMessage state={paymentState} />
              </section>
            ) : null}

            <section className="ui-v2-panel p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Деньги привязаны к этапам</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Оплата, резервирование и разрешение выплаты остаются отдельными состояниями. Приёмка работы не подменяется фактом оплаты.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function StagePaymentCard({
  stage,
  projectId,
  role,
  paymentsEnabled,
}: {
  stage: Stage;
  projectId: string;
  role: "customer" | "contractor";
  paymentsEnabled: boolean;
}) {
  const intent = stage.paymentIntent;
  const info = providerPaymentStatus(intent?.status ?? null);
  const canCreate = role === "customer" && paymentsEnabled && !intent && stage.plannedAmount > 0;

  return (
    <article className="rounded-2xl border border-border bg-background/60 p-4 transition hover:border-primary/20 sm:p-5">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words font-black text-foreground">{stage.title}</p>
            <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${info.className}`}>
              {info.label}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stageStatus(stage.status)} · вес {stage.progressWeight}%
          </p>
          {intent?.failureReason ? <p className="mt-2 break-words text-xs text-red-700">{intent.failureReason}</p> : null}
        </div>
        <div className="shrink-0 lg:text-right">
          <strong className="text-base text-foreground">{money(stage.paidAmount)} / {money(stage.plannedAmount)}</strong>
          <p className="mt-1 text-xs text-muted-foreground">заказчику осталось внести {money(stage.remainingAmount)}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${stage.paymentProgress}%` }} />
      </div>

      {canCreate ? <StagePaymentButton projectId={projectId} stageId={stage.id} /> : null}
      {role === "customer" && paymentsEnabled && intent?.status === "awaiting_payment" && intent.confirmationUrl ? (
        <Link
          href={intent.confirmationUrl}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
        >
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          Продолжить оплату
        </Link>
      ) : null}
      {intent && ["funded", "stage_submitted"].includes(intent.status) ? (
        <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">
          Деньги зарезервированы у платёжного провайдера. Выплата подрядчику заблокирована до приёмки этого этапа заказчиком.
        </p>
      ) : null}
      {intent?.status === "release_ready" ? (
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          Этап принят заказчиком. Выплата разрешена и будет обработана системой.
        </p>
      ) : null}
    </article>
  );
}

function PaymentCard({
  payment,
  projectId,
  role,
  stageTitle,
}: {
  payment: Payment;
  projectId: string;
  role: "customer" | "contractor";
  stageTitle: string | null | undefined;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const status = payment.confirmationStatus;

  function confirm() {
    setMessage("");
    startTransition(async () => {
      const result = await confirmProjectPayment({ paymentId: payment.id, projectId });
      setMessage(result.message);
    });
  }

  function dispute() {
    if (reason.trim().length < 5) {
      setMessage("Укажите причину спора минимум из 5 символов");
      return;
    }
    setMessage("");
    startTransition(async () => {
      const result = await disputeProjectPayment({ paymentId: payment.id, projectId, reason });
      setMessage(result.message);
    });
  }

  function cancel() {
    if (reason.trim().length < 5) {
      setMessage("Укажите причину отмены минимум из 5 символов");
      return;
    }
    setMessage("");
    startTransition(async () => {
      const result = await cancelProjectPaymentConfirmation({ paymentId: payment.id, projectId, reason });
      setMessage(result.message);
    });
  }

  return (
    <article className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-bold text-foreground">{formatDate(payment.paidAt)}</p>
          {stageTitle ? <p className="mt-1 break-words text-xs text-muted-foreground">{stageTitle}</p> : null}
          {payment.note ? <p className="mt-2 break-words text-sm text-muted-foreground">{payment.note}</p> : null}
          <PaymentStatus payment={payment} />
        </div>
        <strong className="shrink-0 text-lg text-foreground">{money(payment.amount)}</strong>
      </div>

      {status !== "cancelled" && status !== "disputed" ? (
        <div className="mt-4 rounded-xl bg-card p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <span className="text-xs font-semibold">Заказчик: {payment.customerConfirmedAt ? "подтверждено" : "ожидается"}</span>
            <span className="text-xs font-semibold">Подрядчик: {payment.contractorConfirmedAt ? "подтверждено" : "ожидается"}</span>
          </div>
          {!payment.currentUserConfirmed && status !== "confirmed" ? (
            <button
              disabled={pending}
              onClick={confirm}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Подтвердить запись
            </button>
          ) : null}
        </div>
      ) : null}

      {status === "disputed" && payment.disputeReason ? (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Причина спора: {payment.disputeReason}</p>
      ) : null}

      {status !== "confirmed" && status !== "cancelled" ? (
        <div className="mt-3 border-t border-border pt-3">
          <label className="block text-xs font-bold text-foreground">
            {role === "customer" ? "Причина спора или отмены" : "Причина спора"}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              placeholder={role === "customer" ? "Причина спора или отмены" : "Причина спора"}
              className="stroy-textarea mt-2 min-h-20"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              disabled={pending}
              onClick={dispute}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-700"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Оспорить
            </button>
            {role === "customer" ? (
              <button
                disabled={pending}
                onClick={cancel}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Отменить запись
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {message ? <p className="mt-3 text-xs font-semibold">{message}</p> : null}
    </article>
  );
}

function providerPaymentStatus(status: string | null) {
  if (!status) return { label: "Оплата не создана", className: "bg-secondary text-muted-foreground" };
  const map: Record<string, { label: string; className: string }> = {
    planned: { label: "Подготовка платежа", className: "bg-secondary text-foreground" },
    awaiting_payment: { label: "Ожидает оплаты заказчиком", className: "bg-amber-50 text-amber-800" },
    funded: { label: "Деньги зарезервированы", className: "bg-blue-50 text-blue-800" },
    stage_submitted: { label: "Этап на приёмке — выплата заблокирована", className: "bg-blue-50 text-blue-800" },
    release_ready: { label: "Этап принят — выплата разрешена", className: "bg-emerald-50 text-emerald-800" },
    payout_processing: { label: "Выплата обрабатывается", className: "bg-violet-50 text-violet-800" },
    paid: { label: "Выплачено подрядчику", className: "bg-emerald-50 text-emerald-800" },
    disputed: { label: "Платёж приостановлен из-за спора", className: "bg-red-50 text-red-800" },
    refund_pending: { label: "Возврат обрабатывается", className: "bg-amber-50 text-amber-800" },
    refunded: { label: "Деньги возвращены заказчику", className: "bg-secondary text-foreground" },
    cancelled: { label: "Платёж отменён", className: "bg-secondary text-muted-foreground" },
  };
  return map[status] ?? { label: `Статус платежа: ${status}`, className: "bg-secondary text-foreground" };
}

function PaymentStatus({ payment }: { payment: Payment }) {
  const status = payment.confirmationStatus;
  const label =
    status === "confirmed"
      ? "Подтверждено обеими сторонами"
      : status === "disputed"
        ? "Оспорено"
        : status === "cancelled"
          ? "Отменено"
          : "Ожидает подтверждения";
  return <p className="mt-2 text-xs font-bold text-muted-foreground">{label}</p>;
}

function Status({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Ожидает согласования",
    approved: "Согласовано",
    rejected: "Отклонено",
    cancelled: "Отменено",
  };
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : status === "pending"
          ? "bg-amber-50 text-amber-700"
          : "bg-secondary text-muted-foreground";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{labels[status] ?? status}</span>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const labels: Record<string, string> = {
    amountDelta: "Изменение стоимости, ₽",
    durationDeltaDays: "Изменение срока, дней",
    paidAt: "Дата платежа",
  };
  const accessibleName = props["aria-label"] ?? props.placeholder ?? labels[String(props.name ?? "")];
  return <input {...props} aria-label={accessibleName} className="stroy-input" />;
}

function Metric({
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
    <div className={["rounded-2xl border p-4 shadow-[var(--shadow-soft)] sm:p-5", emphasized ? "border-primary/15 bg-secondary/65" : "border-border bg-card"].join(" ")}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-xl font-black tracking-[-0.025em] text-foreground">{value}</p>
    </div>
  );
}

function ActionMessage({ state }: { state: Result }) {
  return state ? (
    <p className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {state.message}
    </p>
  ) : null;
}

function stageStatus(value: string) {
  return (
    {
      planned: "Запланирован",
      in_progress: "В работе",
      awaiting_review: "На приёмке",
      revision_required: "Требует доработки",
      completed: "Принят заказчиком",
    } as Record<string, string>
  )[value] ?? value;
}

function money(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function signedMoney(value: number) {
  return `${value > 0 ? "+" : ""}${money(value)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
