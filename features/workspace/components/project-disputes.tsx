"use client";

import { useActionState } from "react";

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

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8">
        <section className="rounded-[2rem] border bg-card p-6 md:p-8">
          <p className="text-sm font-semibold text-primary">Споры и журнал действий</p>
          <h1 className="mt-2 text-3xl font-black">Споры и журнал действий</h1>
          <p className="mt-2 text-muted-foreground">{data.project.title}</p>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            {data.disputes.length === 0 ? (
              <section className="rounded-3xl border bg-card p-6 text-muted-foreground">
                Открытых и завершённых споров пока нет.
              </section>
            ) : (
              data.disputes.map((dispute) => {
                const discussionOpen = ["open", "under_review"].includes(dispute.status);

                return (
                  <article key={dispute.id} className="rounded-3xl border bg-card p-5">
                    <div className="flex justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase text-primary">
                          {label(dispute.status)}
                        </span>
                        <h2 className="mt-1 text-xl font-black">{dispute.subject}</h2>
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {date(dispute.createdAt)}
                      </time>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm">{dispute.description}</p>

                    {dispute.resolution ? (
                      <div className="mt-4 rounded-xl bg-secondary p-4 text-sm">
                        <b>Итог:</b> {dispute.resolution}
                      </div>
                    ) : null}

                    <div className="mt-5 space-y-2">
                      {dispute.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-xl p-3 text-sm ${
                            message.own
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          }`}
                        >
                          <p>{message.body}</p>
                          <p className="mt-1 text-[11px] opacity-70">
                            {dateTime(message.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {discussionOpen ? (
                      <form action={messageAction} className="mt-4 flex gap-2">
                        <input type="hidden" name="projectId" value={data.project.id} />
                        <input type="hidden" name="disputeId" value={dispute.id} />
                        <input
                          name="body"
                          required
                          placeholder="Комментарий или уточнение"
                          className="min-h-11 flex-1 rounded-xl border bg-background px-3"
                        />
                        <button className="rounded-xl bg-secondary px-4 font-semibold">
                          Отправить
                        </button>
                      </form>
                    ) : null}

                    <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
                      Статус спора, итог рассмотрения и закрытие изменяет только администрация
                      СтройВыбор. Заказчик и подрядчик могут предоставлять пояснения и материалы,
                      пока спор находится на рассмотрении.
                    </div>
                  </article>
                );
              })
            )}

            <Message state={messageState} />
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border bg-card p-5">
              <h2 className="text-lg font-black">Открыть спор</h2>
              <form action={openAction} className="mt-4 space-y-3">
                <input type="hidden" name="projectId" value={data.project.id} />
                <input
                  name="subject"
                  required
                  placeholder="Тема спора"
                  className="min-h-11 w-full rounded-xl border bg-background px-3"
                />
                <textarea
                  name="description"
                  required
                  placeholder="Что произошло и какой результат вы ожидаете"
                  className="min-h-28 w-full rounded-xl border bg-background p-3"
                />
                <select
                  name="stageId"
                  className="min-h-11 w-full rounded-xl border bg-background px-3"
                >
                  <option value="">Без привязки к этапу</option>
                  {data.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title}
                    </option>
                  ))}
                </select>
                <select
                  name="changeOrderId"
                  className="min-h-11 w-full rounded-xl border bg-background px-3"
                >
                  <option value="">Без привязки к изменению договора</option>
                  {data.changeOrders.map((change) => (
                    <option key={change.id} value={change.id}>
                      {change.title}
                    </option>
                  ))}
                </select>
                <select
                  name="paymentId"
                  className="min-h-11 w-full rounded-xl border bg-background px-3"
                >
                  <option value="">Без привязки к платежу</option>
                  {data.payments.map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      {payment.amount.toLocaleString("ru-RU")} ₽ · {payment.paidAt}
                    </option>
                  ))}
                </select>
                <button className="min-h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground">
                  Открыть спор
                </button>
              </form>
              <Message state={openState} />
            </section>

            <section className="rounded-3xl border bg-card p-5">
              <h2 className="text-lg font-black">Журнал действий</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Хронологический журнал: записи нельзя изменить или удалить.
              </p>
              <div className="mt-4 max-h-[520px] space-y-3 overflow-auto">
                {data.audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Событий пока нет.</p>
                ) : (
                  data.audit.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-primary/30 pl-3">
                      <p className="text-sm font-semibold">{auditLabel(entry.action)}</p>
                      <p className="text-xs text-muted-foreground">
                        {entityLabel(entry.entity_type)}
                        {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
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

function Message({ state }: { state: Result }) {
  return state ? (
    <p
      className={`mt-3 rounded-xl p-3 text-sm ${
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
