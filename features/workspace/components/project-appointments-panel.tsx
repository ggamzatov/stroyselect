import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  Phone,
  Plus,
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
import { WorkspaceOperationHeader } from "@/features/workspace/components/workspace-operation-header";
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
  const confirmedCount = upcoming.filter((item) => item.status === "confirmed").length;
  const waitingCount = upcoming.filter((item) => item.status === "proposed").length;
  const backHref = role === "customer" ? `/customer/work/${projectId}` : `/contractor/work/${projectId}`;

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <WorkspaceOperationHeader
          backHref={backHref}
          kicker="Планирование проекта"
          title="Встречи и выезды"
          icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
          description={
            <>
              Согласовывайте выезды на объект, встречи и звонки. Время считается подтверждённым только после согласия обеих сторон.
            </>
          }
          metrics={[
            { label: "Ближайших", value: upcoming.length, icon: <CalendarClock className="h-4 w-4" />, tone: "blue" },
            { label: "Подтверждено", value: confirmedCount, icon: <CheckCircle2 className="h-4 w-4" />, tone: "green" },
            { label: "Ожидают", value: waitingCount, icon: <Clock3 className="h-4 w-4" />, tone: "amber" },
          ]}
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="order-2 space-y-5 xl:order-1">
            <section className="space-y-3" aria-labelledby="upcoming-appointments-title">
              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <h2 id="upcoming-appointments-title" className="text-lg font-black tracking-[-0.02em] text-foreground">
                    Ближайшие
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Подтверждённые и ожидающие согласования встречи</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{upcoming.length}</span>
              </div>

              {upcoming.length === 0 ? (
                <div className="ui-v2-panel flex min-h-[260px] items-center justify-center border-dashed px-6 text-center">
                  <div className="max-w-sm">
                    <CalendarClock className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-black">Пока нет запланированных встреч</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Предложите время для выезда, звонка или встречи через форму рядом.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {upcoming.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      projectId={projectId}
                      role={role}
                    />
                  ))}
                </div>
              )}
            </section>

            {history.length > 0 ? (
              <section className="space-y-3" aria-labelledby="appointment-history-title">
                <div className="flex items-center gap-2 px-1">
                  <History className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h2 id="appointment-history-title" className="text-lg font-black tracking-[-0.02em] text-foreground">История</h2>
                </div>
                <div className="grid gap-3">
                  {history.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      projectId={projectId}
                      role={role}
                      compact
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="order-1 xl:order-2">
            <section className="ui-v2-panel p-5 sm:p-6 xl:sticky xl:top-24">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-black text-foreground">Предложить встречу</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Вторая сторона подтвердит или отклонит</p>
                </div>
              </div>

              <form action={createProjectAppointment} className="mt-5 space-y-3">
                <input type="hidden" name="projectId" value={projectId} />

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Формат
                  <select name="appointmentType" defaultValue="site_visit" className="stroy-input min-h-11">
                    <option value="site_visit">Выезд на объект</option>
                    <option value="meeting">Личная встреча</option>
                    <option value="call">Телефонный звонок</option>
                    <option value="video_call">Видеозвонок</option>
                  </select>
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Название
                  <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={160}
                    placeholder="Например: Осмотр объекта"
                    className="stroy-input min-h-11"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5 text-xs font-bold text-foreground">
                    Начало
                    <input type="datetime-local" name="scheduledStart" required className="stroy-input min-h-11 px-2" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold text-foreground">
                    Окончание
                    <input type="datetime-local" name="scheduledEnd" required className="stroy-input min-h-11 px-2" />
                  </label>
                </div>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Место или ссылка
                  <input
                    name="location"
                    maxLength={300}
                    placeholder="Адрес или ссылка на звонок"
                    className="stroy-input min-h-11"
                  />
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Напомнить
                  <select name="reminderMinutes" defaultValue="60" className="stroy-input min-h-11">
                    <option value="0">Без напоминания</option>
                    <option value="30">За 30 минут</option>
                    <option value="60">За 1 час</option>
                    <option value="180">За 3 часа</option>
                    <option value="1440">За 1 день</option>
                  </select>
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Комментарий
                  <textarea
                    name="notes"
                    maxLength={2000}
                    rows={3}
                    placeholder="Что нужно подготовить или обсудить"
                    className="stroy-textarea min-h-20"
                  />
                </label>

                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)]"
                >
                  Предложить время
                </button>
              </form>
            </section>
          </aside>
        </div>
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
    <article className="ui-v2-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
              <TypeIcon type={appointment.appointmentType} />
              {typeLabels[appointment.appointmentType]}
            </span>
            <AppointmentStatus status={appointment.status} />
          </div>

          <div>
            <h3 className="font-black tracking-[-0.01em] text-foreground">{appointment.title}</h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {formatDateTime(appointment.scheduledStart)} — {formatTime(appointment.scheduledEnd)}
            </p>
          </div>

          {!compact && appointment.location ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {appointment.location}
            </p>
          ) : null}

          {!compact && appointment.notes ? (
            <p className="text-sm leading-6 text-muted-foreground">{appointment.notes}</p>
          ) : null}

          {!compact && appointment.status !== "cancelled" && appointment.status !== "completed" ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-lg bg-muted px-2 py-1">Вы: {responseLabel(ownResponse)}</span>
              <span className="rounded-lg bg-muted px-2 py-1">Вторая сторона: {responseLabel(otherResponse)}</span>
              {appointment.reminderAt ? (
                <span className="rounded-lg bg-muted px-2 py-1">Напоминание {formatDateTime(appointment.reminderAt)}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {!compact && (canRespond || canCancel || canComplete) ? (
          <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-64 sm:justify-end">
            {canRespond ? (
              <>
                <form action={respondProjectAppointment}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="response" value="accepted" />
                  <button className="min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Подтвердить</button>
                </form>
                <form action={respondProjectAppointment}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="response" value="declined" />
                  <button className="min-h-10 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground">Отклонить</button>
                </form>
              </>
            ) : null}

            {canComplete ? (
              <form action={completeProjectAppointment}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <button className="min-h-10 rounded-xl border border-primary/30 bg-secondary px-4 text-sm font-bold text-primary">Отметить проведённой</button>
              </form>
            ) : null}

            {canCancel ? (
              <form action={cancelProjectAppointment}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <button className="min-h-10 rounded-xl px-3 text-sm font-bold text-destructive transition hover:bg-red-50">Отменить</button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AppointmentStatus({ status }: { status: ProjectAppointment["status"] }) {
  const className = status === "confirmed"
    ? "bg-emerald-50 text-emerald-700"
    : status === "cancelled"
      ? "bg-red-50 text-red-700"
      : status === "completed"
        ? "bg-secondary text-primary"
        : "bg-amber-50 text-amber-700";

  const icon = status === "confirmed" || status === "completed"
    ? <CheckCircle2 className="h-3.5 w-3.5" />
    : status === "cancelled"
      ? <XCircle className="h-3.5 w-3.5" />
      : <Clock3 className="h-3.5 w-3.5" />;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>
      {icon}
      {statusLabels[status]}
    </span>
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
