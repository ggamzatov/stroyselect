"use client";

import { useActionState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Scale,
  ShieldAlert,
} from "lucide-react";

import {
  addDisputeMessage,
  openProjectDispute,
} from "@/features/workspace/actions/disputes";
import { WorkspaceOperationHeader } from "@/features/workspace/components/workspace-operation-header";

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

  const openCount = data.disputes.filter((dispute) => dispute.status === "open").length;
  const reviewCount = data.disputes.filter((dispute) => dispute.status === "under_review").length;
  const resolvedCount = data.disputes.filter(
    (dispute) => dispute.status === "resolved" || dispute.status === "closed"
  ).length;
  const backHref = data.role === "customer"
    ? `/customer/work/${data.project.id}`
    : `/contractor/work/${data.project.id}`;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <WorkspaceOperationHeader
          backHref={backHref}
          kicker="Контроль спорных ситуаций"
          title="Споры и журнал действий"
          icon={<Scale className="h-5 w-5" aria-hidden="true" />}
          description={
            <>
              <strong className="text-foreground">{data.project.title}</strong>. Фиксируйте предмет спора и пояснения. Итог рассмотрения и закрытие изменяет только администрация СтройВыбор.
            </>
          }
          metrics={[
            { label: "Открыто", value: openCount, icon: <ShieldAlert className="h-4 w-4" />, tone: "red" },
            { label: "На рассмотрении", value: reviewCount, icon: <Clock3 className="h-4 w-4" />, tone: "amber" },
            { label: "Завершено", value: resolvedCount, icon: <CheckCircle2 className="h-4 w-4" />, tone: "green" },
          ]}
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="order-2 space-y-3 xl:order-1">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-foreground">История споров</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Обсуждение и решения по проекту</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{data.disputes.length}</span>
            </div>

            {data.disputes.length === 0 ? (
              <section className="ui-v2-panel flex min-h-[280px] items-center justify-center border-dashed px-6 text-center">
                <div className="max-w-sm">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-black">Споров пока нет</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Если возникнет спорная ситуация, зафиксируйте её через форму рядом — история останется в журнале проекта.
                  </p>
                </div>
              </section>
            ) : (
              data.disputes.map((dispute) => {
                const discussionOpen = ["open", "under_review"].includes(dispute.status);

                return (
                  <article key={dispute.id} className="ui-v2-panel overflow-hidden">
                    <div className="border-b border-border bg-secondary/25 p-5 sm:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <DisputeStatus status={dispute.status} />
                          <h3 className="mt-3 text-xl font-black tracking-[-0.02em] text-foreground">{dispute.subject}</h3>
                        </div>
                        <time className="shrink-0 text-xs text-muted-foreground" dateTime={dispute.createdAt}>
                          {date(dispute.createdAt)}
                        </time>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{dispute.description}</p>

                      {dispute.resolution ? (
                        <div className="mt-4 rounded-xl border border-primary/15 bg-secondary p-4 text-sm leading-6 text-foreground">
                          <strong>Итог:</strong> {dispute.resolution}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4 text-primary" aria-hidden="true" />
                        <h4 className="text-sm font-black text-foreground">Пояснения сторон</h4>
                      </div>

                      <div className="mt-3 space-y-2">
                        {dispute.messages.length === 0 ? (
                          <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">Комментариев пока нет.</p>
                        ) : (
                          dispute.messages.map((message) => (
                            <div
                              key={message.id}
                              className={[
                                "max-w-[88%] rounded-[1.1rem] px-4 py-3 text-sm leading-6 sm:max-w-[76%]",
                                message.own
                                  ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                                  : "rounded-bl-md bg-secondary text-foreground",
                              ].join(" ")}
                            >
                              <p className="whitespace-pre-wrap">{message.body}</p>
                              <p className="mt-1 text-[10px] opacity-65">{dateTime(message.createdAt)}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {discussionOpen ? (
                        <form action={messageAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <input type="hidden" name="projectId" value={data.project.id} />
                          <input type="hidden" name="disputeId" value={dispute.id} />
                          <input
                            name="body"
                            required
                            aria-label={`Комментарий к спору ${dispute.subject}`}
                            placeholder="Комментарий или уточнение"
                            className="stroy-input min-h-11 flex-1"
                          />
                          <button className="min-h-11 rounded-xl bg-secondary px-5 text-sm font-bold text-primary transition hover:bg-accent">
                            Отправить
                          </button>
                        </form>
                      ) : null}

                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/70 p-3 text-xs leading-5 text-muted-foreground">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <p>
                          Статус, итог рассмотрения и закрытие изменяет только администрация СтройВыбор. Участники проекта могут добавлять пояснения, пока спор открыт или находится на рассмотрении.
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}

            <Message state={messageState} />
          </div>

          <aside className="order-1 space-y-4 xl:order-2">
            <section className="ui-v2-panel p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-black text-foreground">Открыть спор</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Зафиксировать спорную ситуацию</p>
                </div>
              </div>

              <form action={openAction} className="mt-5 space-y-3">
                <input type="hidden" name="projectId" value={data.project.id} />

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Тема
                  <input name="subject" required placeholder="Тема спора" className="stroy-input min-h-11" />
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Что произошло
                  <textarea
                    name="description"
                    required
                    placeholder="Опишите ситуацию и ожидаемый результат"
                    className="stroy-textarea min-h-24"
                  />
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Этап
                  <select name="stageId" className="stroy-input min-h-11">
                    <option value="">Без привязки к этапу</option>
                    {data.stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>{stage.title}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Изменение договора
                  <select name="changeOrderId" className="stroy-input min-h-11">
                    <option value="">Без привязки</option>
                    {data.changeOrders.map((change) => (
                      <option key={change.id} value={change.id}>{change.title}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Платёж
                  <select name="paymentId" className="stroy-input min-h-11">
                    <option value="">Без привязки</option>
                    {data.payments.map((payment) => (
                      <option key={payment.id} value={payment.id}>
                        {payment.amount.toLocaleString("ru-RU")} ₽ · {payment.paidAt}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)]">
                  Открыть спор
                </button>
              </form>
              <Message state={openState} />
            </section>

            <section className="ui-v2-panel p-5 sm:p-6 xl:sticky xl:top-24">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Activity className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-black text-foreground">Журнал действий</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Неизменяемая история проекта</p>
                </div>
              </div>

              <div className="mt-5 max-h-[520px] space-y-4 overflow-auto pr-1">
                {data.audit.length === 0 ? (
                  <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">Событий пока нет.</p>
                ) : (
                  data.audit.map((entry) => (
                    <div key={entry.id} className="relative border-l-2 border-primary/20 pl-4">
                      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                      <p className="text-sm font-bold text-foreground">{auditLabel(entry.action)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entityLabel(entry.entity_type)}
                        {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{dateTime(entry.createdAt)}</p>
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

function DisputeStatus({ status }: { status: string }) {
  const item = status === "resolved" || status === "closed"
    ? { label: label(status), cls: "bg-emerald-50 text-emerald-700" }
    : status === "under_review"
      ? { label: label(status), cls: "bg-amber-50 text-amber-700" }
      : { label: label(status), cls: "bg-red-50 text-red-700" };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${item.cls}`}>{item.label}</span>;
}

function Message({ state }: { state: Result }) {
  return state ? (
    <p className={`mt-3 rounded-xl p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
      {state.message}
    </p>
  ) : null;
}

function label(value: string) {
  return ({
    open: "Открыт",
    under_review: "На рассмотрении",
    resolved: "Разрешён",
    closed: "Закрыт",
  } as Record<string, string>)[value] ?? value;
}

function auditLabel(value: string) {
  return ({
    dispute_opened: "Открыт спор",
    dispute_message_added: "Добавлено сообщение",
    dispute_status_changed: "Изменён статус спора",
    admin_dispute_moderated: "Спор обработан администрацией",
  } as Record<string, string>)[value] ?? value;
}

function entityLabel(value: string) {
  return ({
    dispute: "Спор",
    project: "Проект",
    payment: "Платёж",
    change_order: "Изменение договора",
    stage: "Этап",
  } as Record<string, string>)[value] ?? "Событие";
}

function date(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
