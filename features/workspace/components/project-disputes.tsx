"use client";

import { useActionState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  History,
  MessageCircle,
  PlusCircle,
  Send,
  ShieldAlert,
} from "lucide-react";

import {
  addDisputeMessage,
  openProjectDispute,
} from "@/features/workspace/actions/disputes";

type Result = { success: boolean; message: string } | null;
type Data = Awaited<
  ReturnType<
    typeof import("@/features/workspace/queries/get-project-disputes").getProjectDisputes
  >
>;

export function ProjectDisputes({ data }: { data: Data }) {
  const [openState, openAction] = useActionState<Result, FormData>(
    async (_, formData) => openProjectDispute(formData),
    null
  );
  const [messageState, messageAction] = useActionState<Result, FormData>(
    async (_, formData) => addDisputeMessage(formData),
    null
  );

  const activeCount = data.disputes.filter((dispute) =>
    ["open", "under_review"].includes(dispute.status)
  ).length;
  const resolvedCount = data.disputes.filter((dispute) =>
    ["resolved", "closed"].includes(dispute.status)
  ).length;

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-6 md:py-8">
        <section className="ui-v2-panel overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                Контроль спорных ситуаций
              </div>
              <h1 className="mt-4 text-2xl font-black tracking-[-0.035em] sm:text-3xl lg:text-4xl">
                Споры и журнал действий
              </h1>
              <p className="mt-2 break-words text-sm text-muted-foreground">
                {data.project.title}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Фиксируйте спорную ситуацию, обсуждайте её внутри проекта и сохраняйте
                неизменяемую историю действий. Финальный статус и решение устанавливает
                администрация СтройВыбор.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
              <SummaryCard
                label="Активные"
                value={activeCount}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone="warning"
              />
              <SummaryCard
                label="Завершённые"
                value={resolvedCount}
                icon={<CheckCircle2 className="h-4 w-4" />}
                tone="success"
              />
              <SummaryCard
                label="События журнала"
                value={data.audit.length}
                icon={<History className="h-4 w-4" />}
                tone="neutral"
              />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-4">
            {data.disputes.length === 0 ? (
              <section className="ui-v2-panel flex min-h-[260px] items-center justify-center p-6 text-center">
                <div className="max-w-md">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-xl font-black">Споров пока нет</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Если возникнет разногласие по этапу, изменению договора или платежу,
                    его можно зафиксировать в форме справа.
                  </p>
                </div>
              </section>
            ) : (
              data.disputes.map((dispute) => {
                const discussionOpen = ["open", "under_review"].includes(dispute.status);

                return (
                  <article key={dispute.id} className="ui-v2-panel overflow-hidden">
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <DisputeStatus status={dispute.status} />
                          <h2 className="mt-3 break-words text-xl font-black tracking-tight sm:text-2xl">
                            {dispute.subject}
                          </h2>
                        </div>
                        <time className="shrink-0 text-xs text-muted-foreground">
                          {date(dispute.createdAt)}
                        </time>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {dispute.description}
                      </p>

                      {dispute.resolution ? (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                          <div className="flex items-center gap-2 font-bold">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Итог рассмотрения
                          </div>
                          <p className="mt-2">{dispute.resolution}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="border-t border-border bg-muted/25 p-4 sm:p-5">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                        <h3 className="text-sm font-bold">Обсуждение</h3>
                        <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                          {dispute.messages.length}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {dispute.messages.length === 0 ? (
                          <p className="rounded-xl bg-card p-3 text-sm text-muted-foreground">
                            Сообщений по спору пока нет.
                          </p>
                        ) : (
                          dispute.messages.map((message) => (
                            <div
                              key={message.id}
                              className={[
                                "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%]",
                                message.own
                                  ? "ml-auto bg-primary text-primary-foreground"
                                  : "bg-card text-foreground shadow-sm",
                              ].join(" ")}
                            >
                              <p className="break-words">{message.body}</p>
                              <p className="mt-1 text-[11px] opacity-70">
                                {dateTime(message.createdAt)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {discussionOpen ? (
                        <form action={messageAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <input type="hidden" name="projectId" value={data.project.id} />
                          <input type="hidden" name="disputeId" value={dispute.id} />
                          <label className="min-w-0 flex-1">
                            <span className="sr-only">Комментарий или уточнение по спору</span>
                            <input
                              name="body"
                              required
                              placeholder="Комментарий или уточнение"
                              className="min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
                            />
                          </label>
                          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                            <Send className="h-4 w-4" aria-hidden="true" />
                            Отправить
                          </button>
                        </form>
                      ) : (
                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-card p-3 text-xs text-muted-foreground">
                          <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          Обсуждение завершено вместе со статусом спора.
                        </div>
                      )}

                      <div className="mt-4 rounded-xl border border-border bg-card/70 p-3 text-xs leading-5 text-muted-foreground">
                        Статус спора, итог рассмотрения и закрытие изменяет только администрация
                        СтройВыбор. Заказчик и подрядчик могут предоставлять пояснения и материалы,
                        пока спор находится на рассмотрении.
                      </div>
                    </div>
                  </article>
                );
              })
            )}

            <Message state={messageState} />
          </div>

          <aside className="space-y-4">
            <section className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <PlusCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black">Открыть спор</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Привяжите спор к конкретному этапу, изменению или платежу, если это необходимо.
                  </p>
                </div>
              </div>

              <form action={openAction} className="mt-5 space-y-4">
                <input type="hidden" name="projectId" value={data.project.id} />

                <Field label="Тема спора">
                  <input
                    name="subject"
                    required
                    placeholder="Кратко опишите проблему"
                    className="stroy-input"
                  />
                </Field>

                <Field label="Описание ситуации">
                  <textarea
                    name="description"
                    required
                    placeholder="Что произошло и какой результат вы ожидаете"
                    className="stroy-textarea min-h-28"
                  />
                </Field>

                <Field label="Связанный этап — необязательно">
                  <select name="stageId" className="stroy-select">
                    <option value="">Без привязки к этапу</option>
                    {data.stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.title}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Изменение договора — необязательно">
                  <select name="changeOrderId" className="stroy-select">
                    <option value="">Без привязки к изменению договора</option>
                    {data.changeOrders.map((change) => (
                      <option key={change.id} value={change.id}>
                        {change.title}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Платёж — необязательно">
                  <select name="paymentId" className="stroy-select">
                    <option value="">Без привязки к платежу</option>
                    {data.payments.map((payment) => (
                      <option key={payment.id} value={payment.id}>
                        {payment.amount.toLocaleString("ru-RU")} ₽ · {payment.paidAt}
                      </option>
                    ))}
                  </select>
                </Field>

                <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Открыть спор
                </button>
              </form>
              <Message state={openState} />
            </section>

            <section className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <History className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black">Журнал действий</h2>
                  <p className="text-xs text-muted-foreground">
                    Записи нельзя изменить или удалить.
                  </p>
                </div>
              </div>

              <div className="mt-5 max-h-[560px] space-y-4 overflow-auto pr-1">
                {data.audit.length === 0 ? (
                  <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    Событий пока нет.
                  </p>
                ) : (
                  data.audit.map((entry) => (
                    <div key={entry.id} className="relative pl-5">
                      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <span className="absolute bottom-[-18px] left-[3px] top-3 w-px bg-border last:hidden" />
                      <p className="text-sm font-bold">{auditLabel(entry.action)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entityLabel(entry.entity_type)}
                        {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {dateTime(entry.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "warning" | "success" | "neutral";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-[#fff2dc] text-[#a85f00]"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-secondary text-primary";

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DisputeStatus({ status }: { status: string }) {
  const className =
    status === "resolved" || status === "closed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "under_review"
        ? "bg-blue-50 text-blue-700"
        : "bg-[#fff2dc] text-[#a85f00]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${className}`}>
      {label(status)}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Message({ state }: { state: Result }) {
  return state ? (
    <p
      className={`mt-3 rounded-xl p-3 text-sm font-semibold ${
        state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </p>
  ) : null;
}

function label(value: string) {
  return (
    {
      open: "Открыт",
      under_review: "На рассмотрении",
      resolved: "Разрешён",
      closed: "Закрыт",
    } as Record<string, string>
  )[value] ?? value;
}

function auditLabel(value: string) {
  return (
    {
      dispute_opened: "Открыт спор",
      dispute_message_added: "Добавлено сообщение",
      dispute_status_changed: "Изменён статус спора",
      admin_dispute_moderated: "Спор обработан администрацией",
    } as Record<string, string>
  )[value] ?? value;
}

function entityLabel(value: string) {
  return (
    {
      dispute: "Спор",
      project: "Проект",
      payment: "Платёж",
      change_order: "Изменение договора",
      stage: "Этап",
    } as Record<string, string>
  )[value] ?? "Событие";
}

function date(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
