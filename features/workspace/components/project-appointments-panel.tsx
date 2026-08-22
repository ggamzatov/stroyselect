import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  Users,
  Video,
  XCircle,
} from "lucide-react";

import {
  cancelProjectAppointment,
  completeProjectAppointment,
  createProjectAppointment,
  respondProjectAppointment,
} from "@/features/workspace/actions/project-appointments";
import type { ProjectAppointment } from "@/features/workspace/queries/get-project-appointments";

type Props = {
  projectId: string;
  role: "customer" | "contractor";
  appointments: ProjectAppointment[];
};

const typeLabels: Record<ProjectAppointment["appointmentType"], string> = {
  site_visit: "Выезд на объект",
  meeting: "Встреча",
  call: "Телефонный звонок",
  video_call: "Видеозвонок",
};

const statusLabels: Record<ProjectAppointment["status"], string> = {
  proposed: "Ожидает подтверждения",
  confirmed: "Подтверждено",
  completed: "Проведено",
  cancelled: "Отменено",
};

function TypeIcon({ type }: { type: ProjectAppointment["appointmentType"] }) {
  const className = "h-4 w-4";
  if (type === "site_visit") return <MapPin className={className} />;
  if (type === "call") return <Phone className={className} />;
  if (type === "video_call") return <Video className={className} />;
  return <Users className={className} />;
}

export function ProjectAppointmentsPanel({ projectId, role, appointments }: Props) {
  const upcoming = appointments.filter(
    (item) => item.status !== "cancelled" && item.status !== "completed" && !item.hasEnded
  );
  const upcomingIds = new Set(upcoming.map((item) => item.id));
  const history = appointments.filter((item) => !upcomingIds.has(item.id));

  return (
    <main className="app-container py-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CalendarClock className="h-4 w-4" />
            Планирование проекта
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Встречи и выезды</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            Согласовывайте выезды на объект, встречи и звонки. Время считается подтверждённым только после согласия обеих сторон.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Предложить встречу</h2>
            <p className="mt-1 text-sm text-muted-foreground">Вторая сторона увидит предложение и сможет подтвердить или отклонить его.</p>
          </div>
          <form action={createProjectAppointment} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="projectId" value={projectId} />
            <label className="space-y-1.5 text-sm font-medium">
              Формат
              <select name="appointmentType" defaultValue="site_visit" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                <option value="site_visit">Выезд на объект</option>
                <option value="meeting">Личная встреча</option>
                <option value="call">Телефонный звонок</option>
                <option value="video_call">Видеозвонок</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Название
              <input name="title" required minLength={2} maxLength={160} placeholder="Например: Осмотр объекта перед началом работ" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Начало
              <input type="datetime-local" name="scheduledStart" required className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Окончание
              <input type="datetime-local" name="scheduledEnd" required className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Место или ссылка
              <input name="location" maxLength={300} placeholder="Адрес объекта, офис или ссылка на видеозвонок" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Напомнить
              <select name="reminderMinutes" defaultValue="60" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                <option value="0">Без напоминания</option>
                <option value="30">За 30 минут</option>
                <option value="60">За 1 час</option>
                <option value="180">За 3 часа</option>
                <option value="1440">За 1 день</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium md:col-span-2">
              Комментарий
              <textarea name="notes" maxLength={2000} rows={3} placeholder="Что нужно подготовить или обсудить" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
                Предложить время
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Ближайшие</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{upcoming.length}</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Пока нет запланированных встреч.
            </div>
          ) : (
            <div className="grid gap-4">
              {upcoming.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} projectId={projectId} role={role} />
              ))}
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">История</h2>
            <div className="grid gap-3">
              {history.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} projectId={projectId} role={role} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function AppointmentCard({
  appointment,
  projectId,
  role,
  compact = false,
}: {
  appointment: ProjectAppointment;
  projectId: string;
  role: Props["role"];
  compact?: boolean;
}) {
  const ownResponse = role === "customer" ? appointment.customerResponse : appointment.contractorResponse;
  const otherResponse = role === "customer" ? appointment.contractorResponse : appointment.customerResponse;
  const canRespond = appointment.status === "proposed" && ownResponse === "pending";
  const canCancel = appointment.status === "proposed" || appointment.status === "confirmed";
  const canComplete = appointment.status === "confirmed" && appointment.hasStarted;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
              <TypeIcon type={appointment.appointmentType} />
              {typeLabels[appointment.appointmentType]}
            </span>
            <span className={[
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              appointment.status === "confirmed" ? "bg-emerald-500/10 text-emerald-700" :
              appointment.status === "cancelled" ? "bg-destructive/10 text-destructive" :
              appointment.status === "completed" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700",
            ].join(" ")}>
              {appointment.status === "confirmed" || appointment.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : appointment.status === "cancelled" ? <XCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
              {statusLabels[appointment.status]}
            </span>
          </div>
          <div>
            <h3 className="font-semibold">{appointment.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateTime(appointment.scheduledStart)} — {formatTime(appointment.scheduledEnd)}
            </p>
          </div>
          {!compact && appointment.location && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{appointment.location}</p>
          )}
          {!compact && appointment.notes && <p className="text-sm text-muted-foreground">{appointment.notes}</p>}
          {!compact && appointment.status !== "cancelled" && appointment.status !== "completed" && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Вы: {responseLabel(ownResponse)}</span>
              <span>•</span>
              <span>Вторая сторона: {responseLabel(otherResponse)}</span>
              {appointment.reminderAt && <><span>•</span><span>Напоминание {formatDateTime(appointment.reminderAt)}</span></>}
            </div>
          )}
        </div>

        {!compact && (canRespond || canCancel || canComplete) && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-64 sm:justify-end">
            {canRespond && (
              <>
                <form action={respondProjectAppointment}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="response" value="accepted" />
                  <button className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Подтвердить</button>
                </form>
                <form action={respondProjectAppointment}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="response" value="declined" />
                  <button className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold">Отклонить</button>
                </form>
              </>
            )}
            {canComplete && (
              <form action={completeProjectAppointment}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <button className="min-h-10 rounded-xl border border-primary/30 px-4 text-sm font-semibold text-primary">Отметить проведённой</button>
              </form>
            )}
            {canCancel && (
              <form action={cancelProjectAppointment}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <button className="min-h-10 rounded-xl px-3 text-sm font-medium text-destructive">Отменить</button>
              </form>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function responseLabel(response: ProjectAppointment["customerResponse"]) {
  if (response === "accepted") return "подтверждено";
  if (response === "declined") return "отклонено";
  return "ожидается";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}
