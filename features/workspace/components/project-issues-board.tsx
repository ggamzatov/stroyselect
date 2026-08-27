import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Clock3,
  ListChecks,
  Plus,
} from "lucide-react";

import {
  createProjectIssue,
  updateProjectIssueStatus,
} from "@/features/workspace/actions/project-issues";
import { WorkspaceOperationHeader } from "@/features/workspace/components/workspace-operation-header";

type Data = Awaited<
  ReturnType<
    typeof import("@/features/workspace/queries/get-project-issues").getProjectIssues
  >
>;

export function ProjectIssuesBoard({
  data,
  backHref,
}: {
  data: Data;
  backHref: string;
}) {
  const openCount = data.issues.filter(
    (issue) => issue.status !== "resolved" && issue.status !== "cancelled"
  ).length;
  const resolvedCount = data.issues.filter((issue) => issue.status === "resolved").length;
  const criticalCount = data.issues.filter(
    (issue) => issue.priority === "critical" && issue.status !== "resolved" && issue.status !== "cancelled"
  ).length;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <WorkspaceOperationHeader
          backHref={backHref}
          kicker="Контроль качества"
          title="Замечания по работам"
          icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
          description={
            <>
              <strong className="text-foreground">{data.project.title}</strong>. Фиксируйте недочёты, привязывайте их к этапам и доводите каждое замечание до решения.
            </>
          }
          metrics={[
            { label: "Открыто", value: openCount, icon: <CircleAlert className="h-4 w-4" />, tone: "amber" },
            { label: "Решено", value: resolvedCount, icon: <CheckCircle2 className="h-4 w-4" />, tone: "green" },
            { label: "Критических", value: criticalCount, icon: <AlertTriangle className="h-4 w-4" />, tone: "red" },
          ]}
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="order-2 space-y-3 xl:order-1" aria-labelledby="issues-list-title">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h2 id="issues-list-title" className="text-lg font-black tracking-[-0.02em] text-foreground">
                  Список замечаний
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.issues.length > 0 ? `Всего записей: ${data.issues.length}` : "Активных замечаний пока нет"}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                {openCount} в работе
              </span>
            </div>

            {data.issues.length === 0 ? (
              <div className="ui-v2-panel flex min-h-[280px] items-center justify-center border-dashed px-6 text-center">
                <div className="max-w-sm">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-black">Замечаний пока нет</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Когда потребуется зафиксировать недочёт, создайте его через форму рядом.
                  </p>
                </div>
              </div>
            ) : (
              data.issues.map((issue) => (
                <article key={issue.id} className="ui-v2-panel p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <IssueStatus status={issue.status} />
                        <Priority priority={issue.priority} />
                        {issue.stageTitle ? (
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
                            {issue.stageTitle}
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-3 text-lg font-black tracking-[-0.015em] text-foreground">
                        {issue.title}
                      </h2>

                      {issue.description ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {issue.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Создал: <strong className="text-foreground">{issue.creatorName}</strong></span>
                        {issue.assigneeName ? <span>Ответственный: <strong className="text-foreground">{issue.assigneeName}</strong></span> : null}
                        {issue.dueAt ? <span>Срок: <strong className="text-foreground">{formatDate(issue.dueAt)}</strong></span> : null}
                      </div>
                    </div>

                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={issue.createdAt}>
                      {formatDateTime(issue.createdAt)}
                    </time>
                  </div>

                  {issue.status !== "resolved" && issue.status !== "cancelled" ? (
                    <form action={updateProjectIssueStatus} className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                      <input type="hidden" name="projectId" value={data.project.id} />
                      <input type="hidden" name="issueId" value={issue.id} />
                      {issue.status === "open" ? (
                        <button
                          name="status"
                          value="in_progress"
                          className="min-h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground transition hover:bg-secondary"
                        >
                          Взять в работу
                        </button>
                      ) : null}
                      <button
                        name="status"
                        value="resolved"
                        className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                      >
                        Отметить решённым
                      </button>
                      <button
                        name="status"
                        value="cancelled"
                        className="min-h-10 rounded-xl px-3 text-xs font-bold text-muted-foreground transition hover:bg-muted"
                      >
                        Отменить
                      </button>
                    </form>
                  ) : null}
                </article>
              ))
            )}
          </section>

          <aside className="order-1 xl:order-2">
            <section className="ui-v2-panel p-5 sm:p-6 xl:sticky xl:top-24">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-black text-foreground">Новое замечание</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Зафиксировать недочёт по работам</p>
                </div>
              </div>

              <form action={createProjectIssue} className="mt-5 space-y-3">
                <input type="hidden" name="projectId" value={data.project.id} />

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Проблема
                  <input
                    name="title"
                    required
                    minLength={3}
                    maxLength={240}
                    placeholder="Кратко опишите проблему"
                    className="stroy-input min-h-11"
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
                  Описание
                  <textarea
                    name="description"
                    maxLength={3000}
                    placeholder="Что нужно исправить или проверить"
                    className="stroy-textarea min-h-24"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5 text-xs font-bold text-foreground">
                    Приоритет
                    <select name="priority" defaultValue="normal" className="stroy-input min-h-11">
                      <option value="low">Низкий</option>
                      <option value="normal">Обычный</option>
                      <option value="high">Высокий</option>
                      <option value="critical">Критический</option>
                    </select>
                  </label>

                  <label className="block space-y-1.5 text-xs font-bold text-foreground">
                    Срок устранения
                    <input
                      name="dueAt"
                      type="date"
                      aria-label="Срок устранения замечания"
                      className="stroy-input min-h-11"
                    />
                  </label>
                </div>

                <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)]">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Создать замечание
                </button>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function IssueStatus({ status }: { status: string }) {
  const item = status === "resolved"
    ? { label: "Решено", icon: <CheckCircle2 className="h-3 w-3" />, cls: "bg-emerald-50 text-emerald-700" }
    : status === "in_progress"
      ? { label: "В работе", icon: <Clock3 className="h-3 w-3" />, cls: "bg-amber-50 text-amber-700" }
      : status === "cancelled"
        ? { label: "Отменено", icon: <CircleDot className="h-3 w-3" />, cls: "bg-secondary text-muted-foreground" }
        : { label: "Открыто", icon: <CircleDot className="h-3 w-3" />, cls: "bg-blue-50 text-blue-700" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${item.cls}`}>
      {item.icon}
      {item.label}
    </span>
  );
}

function Priority({ priority }: { priority: string }) {
  const label = priority === "critical" ? "Критический" : priority === "high" ? "Высокий" : priority === "low" ? "Низкий" : "Обычный";
  const cls = priority === "critical" ? "bg-red-50 text-red-700" : priority === "high" ? "bg-orange-50 text-orange-700" : "bg-secondary text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {(priority === "critical" || priority === "high") ? <AlertTriangle className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
