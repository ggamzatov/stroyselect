"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ListTodo,
  Loader2,
  NotebookPen,
  Save,
  Star,
  Trash2,
  UsersRound,
} from "lucide-react";

import {
  createAdvisorTask,
  deleteAdvisorTask,
  saveAdvisorCandidate,
  toggleAdvisorTask,
} from "@/features/projects/actions/project-advisor-actions";

export type AdvisorCandidate = {
  contractorId: string;
  publicName: string;
  rating: number;
  ratingCount: number;
  completedProjectsCount: number;
  stroySelectScore: number;
  matchScore: number | null;
  stage: string;
  note: string;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  bid: {
    id: string;
    status: string;
    price: number | null;
    durationDays: number | null;
  } | null;
};

type AdvisorTask = {
  id: string;
  title: string;
  dueAt: string | null;
  isCompleted: boolean;
};

type AdvisorActivity = {
  id: string;
  contractorName: string | null;
  activityType: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type Props = {
  projectId: string;
  candidates: AdvisorCandidate[];
  tasks: AdvisorTask[];
  activity: AdvisorActivity[];
};

const STAGES = [
  ["new", "Новый"],
  ["viewed", "Просмотрен"],
  ["shortlisted", "Shortlist"],
  ["contacted", "Связались"],
  ["proposal_received", "Есть предложение"],
  ["finalist", "Финалист"],
  ["archived", "Не подходит"],
] as const;

export function ProjectAdvisorBoard({ projectId, candidates, tasks, activity }: Props) {
  const openTasks = tasks.filter((task) => !task.isCompleted).length;
  const shortlisted = candidates.filter((candidate) => ["shortlisted", "finalist"].includes(candidate.stage)).length;
  const withBids = candidates.filter((candidate) => candidate.bid).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Кандидаты" value={String(candidates.length)} icon={<UsersRound className="h-5 w-5" />} />
        <Metric label="Shortlist / финалисты" value={String(shortlisted)} icon={<Star className="h-5 w-5" />} />
        <Metric label="Предложения" value={String(withBids)} icon={<NotebookPen className="h-5 w-5" />} />
        <Metric label="Открытые задачи" value={String(openTasks)} icon={<ListTodo className="h-5 w-5" />} />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-foreground">Воронка подрядчиков</h2>
              <p className="mt-1 text-sm text-muted-foreground">Фиксируйте shortlist, контакт, follow-up и внутренние заметки.</p>
            </div>
          </div>

          {candidates.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-card p-8 text-center">
              <p className="font-semibold text-foreground">Кандидатов пока нет</p>
              <p className="mt-2 text-sm text-muted-foreground">Откройте умный подбор — подходящие подрядчики появятся здесь.</p>
              <Link href={`/customer/projects/${projectId}/matches`} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Открыть подбор
              </Link>
            </div>
          ) : (
            candidates.map((candidate) => (
              <CandidateCard key={`${candidate.contractorId}-${candidate.stage}-${candidate.nextFollowUpAt ?? ""}`} projectId={projectId} candidate={candidate} />
            ))
          )}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <TaskPanel projectId={projectId} tasks={tasks} />
          <ActivityPanel activity={activity} />
        </aside>
      </div>
    </div>
  );
}

function CandidateCard({ projectId, candidate }: { projectId: string; candidate: AdvisorCandidate }) {
  const router = useRouter();
  const [stage, setStage] = useState(candidate.stage === "selected" ? "finalist" : candidate.stage);
  const [note, setNote] = useState(candidate.note);
  const [lastContactAt, setLastContactAt] = useState(toLocalInput(candidate.lastContactAt));
  const [nextFollowUpAt, setNextFollowUpAt] = useState(toLocalInput(candidate.nextFollowUpAt));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const isSelected = candidate.stage === "selected";

  function save() {
    setMessage("");
    startTransition(async () => {
      const result = await saveAdvisorCandidate({
        projectId,
        contractorId: candidate.contractorId,
        stage,
        note,
        lastContactAt: lastContactAt || null,
        nextFollowUpAt: nextFollowUpAt || null,
      });
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-foreground">{candidate.publicName}</h3>
            {isSelected && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Выбран</span>}
            {candidate.bid && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">Есть предложение</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-secondary px-3 py-1.5 font-semibold text-foreground">StroySelect {candidate.stroySelectScore}/100</span>
            {candidate.matchScore !== null && <span className="rounded-full bg-secondary px-3 py-1.5 font-semibold text-foreground">Match {Math.round(candidate.matchScore)}%</span>}
            <span className="rounded-full bg-secondary px-3 py-1.5 font-semibold text-foreground">Рейтинг {candidate.ratingCount > 0 ? candidate.rating.toFixed(1) : "новый"}</span>
            <span className="rounded-full bg-secondary px-3 py-1.5 font-semibold text-foreground">{candidate.completedProjectsCount} проектов</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/customer/contractors/${candidate.contractorId}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-primary">
            Профиль <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          {candidate.bid && (
            <Link href={`/customer/projects/${projectId}/bids/compare`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-primary">
              Смета <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {candidate.bid && (
        <div className="mt-4 rounded-xl bg-secondary/45 p-3 text-sm text-foreground">
          <strong>{candidate.bid.price !== null ? formatMoney(candidate.bid.price) : "Цена не указана"}</strong>
          {candidate.bid.durationDays ? ` · ${candidate.bid.durationDays} дн.` : ""}
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-foreground">
          Этап воронки
          <select
            value={isSelected ? "finalist" : stage}
            disabled={isSelected || isPending}
            onChange={(event) => setStage(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
          >
            {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="text-sm font-semibold text-foreground">
          Последний контакт
          <input
            type="datetime-local"
            value={lastContactAt}
            disabled={isSelected || isPending}
            onChange={(event) => setLastContactAt(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="text-sm font-semibold text-foreground md:col-span-2">
          Следующий follow-up
          <input
            type="datetime-local"
            value={nextFollowUpAt}
            disabled={isSelected || isPending}
            onChange={(event) => setNextFollowUpAt(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="text-sm font-semibold text-foreground md:col-span-2">
          Внутренняя заметка
          <textarea
            value={note}
            disabled={isSelected || isPending}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Что понравилось, что уточнить, риски, договорённости..."
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-primary"
          />
        </label>
      </div>

      {!isSelected && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={isPending} onClick={save} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить
          </button>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      )}
    </article>
  );
}

function TaskPanel({ projectId, tasks }: { projectId: string; tasks: AdvisorTask[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const sortedTasks = useMemo(() => tasks, [tasks]);

  function createTask() {
    startTransition(async () => {
      const result = await createAdvisorTask({ projectId, title, dueAt: dueAt || null });
      setMessage(result.message);
      if (result.success) {
        setTitle("");
        setDueAt("");
        router.refresh();
      }
    });
  }

  function toggle(task: AdvisorTask) {
    startTransition(async () => {
      const result = await toggleAdvisorTask({ projectId, taskId: task.id, completed: !task.isCompleted });
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  function remove(taskId: string) {
    startTransition(async () => {
      const result = await deleteAdvisorTask({ projectId, taskId });
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"><ListTodo className="h-5 w-5" /></div>
        <div><h2 className="font-black text-foreground">Follow-up задачи</h2><p className="text-xs text-muted-foreground">Не потерять следующий шаг</p></div>
      </div>

      <div className="mt-4 space-y-3">
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} placeholder="Например: позвонить финалистам" className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
        <label className="block text-xs font-semibold text-muted-foreground">
          Срок задачи
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" />
        </label>
        <button type="button" disabled={isPending || !title.trim()} onClick={createTask} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Добавить задачу
        </button>
      </div>

      <div className="mt-5 space-y-2">
        {sortedTasks.length === 0 ? <p className="text-sm text-muted-foreground">Задач пока нет.</p> : sortedTasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => toggle(task)}
              aria-label={task.isCompleted ? "Вернуть задачу в работу" : "Отметить задачу выполненной"}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-primary"
            >
              {task.isCompleted ? <Check className="h-4 w-4" /> : null}
            </button>
            <div className="min-w-0 flex-1">
              <p className={task.isCompleted ? "text-sm text-muted-foreground line-through" : "text-sm font-semibold text-foreground"}>{task.title}</p>
              {task.dueAt && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{formatDateTime(task.dueAt)}</p>}
            </div>
            <button type="button" disabled={isPending} onClick={() => remove(task.id)} className="text-muted-foreground hover:text-red-600" aria-label="Удалить задачу"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}

function ActivityPanel({ activity }: { activity: AdvisorActivity[] }) {
  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"><CheckCircle2 className="h-5 w-5" /></div>
        <div><h2 className="font-black text-foreground">История решений</h2><p className="text-xs text-muted-foreground">Последние изменения CRM</p></div>
      </div>

      <div className="mt-4 space-y-3">
        {activity.length === 0 ? <p className="text-sm text-muted-foreground">История пока пустая.</p> : activity.slice(0, 12).map((item) => (
          <div key={item.id} className="border-l-2 border-border pl-3">
            <p className="text-sm font-semibold text-foreground">{activityLabel(item)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-[1.25rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)]"><div className="text-primary">{icon}</div><p className="mt-3 text-2xl font-black text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}

function activityLabel(item: AdvisorActivity) {
  const name = item.contractorName ? ` — ${item.contractorName}` : "";
  switch (item.activityType) {
    case "stage_changed": return `Изменён этап${name}`;
    case "note_updated": return `Обновлена заметка${name}`;
    case "follow_up_changed": return `Изменён follow-up${name}`;
    case "task_created": return "Создана follow-up задача";
    case "task_completed": return "Задача выполнена";
    case "task_reopened": return "Задача возвращена в работу";
    case "task_deleted": return "Задача удалена";
    default: return "Обновление проекта";
  }
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
