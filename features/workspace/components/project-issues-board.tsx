import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  ListChecks,
  Plus,
  ShieldAlert,
} from "lucide-react";

import {
  createProjectIssue,
  updateProjectIssueStatus,
} from "@/features/workspace/actions/project-issues";

type Data = Awaited<
  ReturnType<typeof import("@/features/workspace/queries/get-project-issues").getProjectIssues>
>;

type Props = {
  data: Data;
  backHref: string;
};

export function ProjectIssuesBoard({ data, backHref }: Props) {
  const openCount = data.issues.filter(
    (issue) => issue.status !== "resolved" && issue.status !== "cancelled"
  ).length;
  const inProgressCount = data.issues.filter((issue) => issue.status === "in_progress").length;
  const resolvedCount = data.issues.filter((issue) => issue.status === "resolved").length;

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <Link
          href={backHref}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          ← Вернуться к проекту
        </Link>

        <section className="ui-v2-panel mt-4 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <ListChecks className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Контроль качества</p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
                    Замечания по работам
                  </h1>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                {data.project.title}. Фиксируйте недочёты, привязывайте их к этапам, задавайте приоритет и отслеживайте устранение до закрытия.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              <Metric value={openCount} label="открыто" tone="orange" />
              <Metric value={inProgressCount} label="в работе" tone="blue" />
              <Metric value={resolvedCount} label="решено" tone="green" />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="ui-v2-panel order-2 p-4 sm:p-5 xl:order-1" aria-labelledby="issues-list-title">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 id="issues-list-title" className="text-lg font-black text-foreground">Список замечаний</h2>
                <p className="mt-1 text-xs text-muted-foreground">История контроля и исправлений по объекту</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                {data.issues.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {data.issues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">Замечаний пока нет</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Все новые вопросы по качеству будут собраны здесь.</p>
                </div>
              ) : (
                data.issues.map((issue) => (
                  <article
                    key={issue.id}
                    className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/20 hover:shadow-[var(--shadow-soft)] sm:p-5"
                  >
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

                        <h3 className="mt-3 break-words text-base font-black text-foreground sm:text-lg">
                          {issue.title}
                        </h3>

                        {issue.description ? (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                            {issue.description}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                          <span>Создал: <strong className="font-semibold text-foreground">{issue.creatorName}</strong></span>
                          {issue.assigneeName ? (
                            <span>Ответственный: <strong className="font-semibold text-foreground">{issue.assigneeName}</strong></span>
                          ) : null}
                          {issue.dueAt ? (
                            <span>Срок: <strong className="font-semibold text-foreground">{formatDate(issue.dueAt)}</strong></span>
                          ) : null}
                        </div>
                      </div>

                      <time className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(issue.createdAt)}
                      </time>
                    </div>

                    {issue.status !== "resolved" && issue.status !== "cancelled" ? (
                      <form action={updateProjectIssueStatus} className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                        <input type="hidden" name="projectId" value={data.project.id} />
                        <input type="hidden" name="issueId" value={issue.id} />
                        {issue.status === "open" ? (
                          <button
                            name="status"
                            value="in_progress"
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 text-xs font-bold text-foreground transition hover:border-primary/25 hover:text-primary"
                          >
                            <Clock3 className="h-4 w-4" aria-hidden="true" />
                            Взять в работу
                          </button>
                        ) : null}
                        <button
                          name="status"
                          value="resolved"
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground transition hover:bg-[#076c47]"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Отметить решённым
                        </button>
                        <button
                          name="status"
                          value="cancelled"
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3.5 text-xs font-semibold text-muted-foreground transition hover:border-red-200 hover:text-red-600"
                        >
                          Отменить
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <aside className="order-1 space-y-4 xl:order-2">
            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="new-issue-title">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="new-issue-title" className="font-black text-foreground">Новое замечание</h2>
                  <p className="text-xs text-muted-foreground">Зафиксировать недочёт или вопрос</p>
                </div>
              </div>

              <form action={createProjectIssue} className="mt-5 space-y-4">
                <input type="hidden" name="projectId" value={data.project.id} />

                <label className="block text-xs font-bold text-foreground">
                  Заголовок
                  <input
                    name="title"
                    required
                    minLength={3}
                    maxLength={240}
                    placeholder="Кратко опишите проблему"
                    className="stroy-input mt-2"
                  />
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Этап
                  <select name="stageId" className="stroy-input mt-2">
                    <option value="">Без привязки к этапу</option>
                    {data.stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>{stage.title}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Описание
                  <textarea
                    name="description"
                    maxLength={3000}
                    placeholder="Что нужно исправить или проверить"
                    className="stroy-textarea mt-2 min-h-28"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block text-xs font-bold text-foreground">
                    Приоритет
                    <select name="priority" defaultValue="normal" className="stroy-input mt-2">
                      <option value="low">Низкий</option>
                      <option value="normal">Обычный</option>
                      <option value="high">Высокий</option>
                      <option value="critical">Критический</option>
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-foreground">
                    Срок устранения
                    <input
                      name="dueAt"
                      type="date"
                      aria-label="Срок устранения замечания"
                      className="stroy-input mt-2"
                    />
                  </label>
                </div>

                <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)] transition hover:-translate-y-0.5 hover:bg-[#076c47]">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Создать замечание
                </button>
              </form>
            </section>

            <section className="ui-v2-panel p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff3e6] text-[#c26f17]">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Все изменения сохраняются</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Статус замечания меняется через существующий журнал проекта, поэтому история контроля остаётся доступной обеим сторонам.
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

function Metric({ value, label, tone }: { value: number; label: string; tone: "green" | "orange" | "blue" }) {
  const toneClass =
    tone === "green"
      ? "bg-[#edf8f1] text-primary"
      : tone === "orange"
        ? "bg-[#fff3e6] text-[#c26f17]"
        : "bg-[#edf7ff] text-[#2474a6]";

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3 text-center">
      <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
        {tone === "green" ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : tone === "orange" ? (
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Clock3 className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <p className="mt-2 text-xl font-black tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function IssueStatus({ status }: { status: string }) {
  const item =
    status === "resolved"
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
  const label =
    priority === "critical" ? "Критический" : priority === "high" ? "Высокий" : priority === "low" ? "Низкий" : "Обычный";
  const cls =
    priority === "critical"
      ? "bg-red-50 text-red-700"
      : priority === "high"
        ? "bg-orange-50 text-orange-700"
        : "bg-secondary text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {priority === "critical" || priority === "high" ? <AlertTriangle className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
