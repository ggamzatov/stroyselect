import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
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

function TypeIcon({ type, className = "h-4 w-4" }: { type: ProjectAppointment["appointmentType"]; className?: string }) {
  if (type === "site_visit") return <MapPin className={className} aria-hidden="true" />;
  if (type === "call") return <Phone className={className} aria-hidden="true" />;
  if (type === "video_call") return <Video className={className} aria-hidden="true" />;
  return <Users className={className} aria-hidden="true" />;
}

export function ProjectAppointmentsPanel({ projectId, role, appointments }: Props) {
  const upcoming = appointments.filter(
    (item) => item.status !== "cancelled" && item.status !== "completed" && !item.hasEnded
  );
  const upcomingIds = new Set(upcoming.map((item) => item.id));
  const history = appointments.filter((item) => !upcomingIds.has(item.id));
  const confirmedCount = upcoming.filter((item) => item.status === "confirmed").length;
  const waitingCount = upcoming.filter((item) => item.status === "proposed").length;
  const backHref = `/${role}/work/${projectId}`;

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <Link
          href={backHref}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Вернуться к проекту
        </Link>

        <section className="ui-v2-panel mt-4 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Планирование проекта</p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
                    Встречи и выезды
                  </h1>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                Согласовывайте выезды на объект, встречи и звонки. Время становится подтверждённым только после согласия обеих сторон.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[500px]">
              <Metric value={upcoming.length} label="ближайших" icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} />
              <Metric value={confirmedCount} label="подтверждено" icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} />
              <Metric value={waitingCount} label="ожидают" icon={<Clock3 className="h-4 w-4" aria-hidden="true" />} />
              <Metric value={history.length} label="в истории" icon={<History className="h-4 w-4" aria-hidden="true" />} />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="order-2 space-y-5 xl:order-1">
            <section className="ui-v2-panel p-4 sm:p-5 lg:p-6" aria-labelledby="upcoming-appointments-title">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 id="upcoming-appointments-title" className="text-lg font-black text-foreground sm:text-xl">
                    Ближайшие
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">Актуальные встречи, выезды и звонки по проекту</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                  {upcoming.length}
                </span>
              </div>

              {upcoming.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <CalendarClock className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">Пока нет запланированных встреч</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                    Предложите удобное время — вторая сторона сможет подтвердить или отклонить его.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {upcoming.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} projectId={projectId} role={role} />
                  ))}
                </div>
              )}
            </section>

            <section className="ui-v2-panel p-4 sm:p-5 lg:p-6" aria-labelledby="appointments-history-title">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 id="appointments-history-title" className="text-lg font-black text-foreground">История</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Проведённые, завершившиеся и отменённые события</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  {history.length}
                </span>
              </div>

              {history.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {history.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} projectId={projectId} role={role} compact />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-muted/45 px-5 py-8 text-center text-sm text-muted-foreground">
                  История появится после проведения или отмены первой встречи.
                </div>
              )}
            </section>
          </div>

          <aside className="order-1 space-y-4 xl:order-2">
            <section className="ui-v2-panel p-5 sm:p-6 xl:sticky xl:top-6" aria-labelledby="create-appointment-title">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="create-appointment-title" className="font-black text-foreground">Предложить встречу</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Вторая сторона увидит предложение и сможет подтвердить или отклонить его.
                  </p>
                </div>
              </div>

              <form action={createProjectAppointment} className="mt-5 space-y-4">
                <input type="hidden" name="projectId" value={projectId} />

                <label className="block text-xs font-bold text-foreground">
                  Формат
                  <select name="appointmentType" defaultValue="site_visit" className="stroy-input mt-2">
                    <option value="site_visit">Выезд на объект</option>
                    <option value="meeting">Личная встреча</option>
                    <option value="call">Телефонный звонок</option>
                    <option value="video_call">Видеозвонок</option>
                  </select>
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Название
                  <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={160}
                    placeholder="Например: Осмотр объекта перед началом работ"
                    className="stroy-input mt-2"
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block text-xs font-bold text-foreground">
                    Начало
                    <input type="datetime-local" name="scheduledStart" required className="stroy-input mt-2" />
                  </label>
                  <label className="block text-xs font-bold text-foreground">
                    Окончание
                    <input type="datetime-local" name="scheduledEnd" required className="stroy-input mt-2" />
                  </label>
                </div>

                <label className="block text-xs font-bold text-foreground">
                  Место или ссылка
                  <input
                    name="location"
                    maxLength={300}
                    placeholder="Адрес объекта, офис или ссылка на видеозвонок"
                    className="stroy-input mt-2"
                  />
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Напомнить
                  <select name="reminderMinutes" defaultValue="60" className="stroy-input mt-2">
                    <option value="0">Без напоминания</option>
                    <option value="30">За 30 минут</option>
                    <option value="60">За 1 час</option>
                    <option value="180">За 3 часа</option>
                    <option value="1440">За 1 день</option>
                  </select>
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Комментарий
                  <textarea
                    name="notes"
                    maxLength={2000}
                    rows={3}
                    placeholder="Что нужно подготовить или обсудить"
                    className="stroy-input mt-2 min-h-24 resize-y py-3"
                  />
                </label>

                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)] transition hover:-translate-y-0.5 hover:bg-[#076c47]"
                >
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  Предложить время
                </button>
              </form>
            </section>

            <section className="ui-v2-panel p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Подтверждение обеими сторонами</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Предложенное время не считается согласованным, пока заказчик и подрядчик не подтвердят встречу.
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
    <article className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/20 hover:shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
              <TypeIcon type={appointment.appointmentType} />
              {typeLabels[appointment.appointmentType]}
            </span>
            <StatusBadge status={appointment.status} />
          </div>

          <h3 className="mt-3 text-base font-black text-foreground sm:text-lg">{appointment.title}</h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
              {formatDateTime(appointment.scheduledStart)} — {formatTime(appointment.scheduledEnd)}
            </span>
            {!compact && appointment.reminderAt ? (
              <span className="inline-flex items-center gap-1.5">
                <BellRing className="h-4 w-4" aria-hidden="true" />
                Напоминание {formatDateTime(appointment.reminderAt)}
              </span>
            ) : null}
          </div>

          {!compact && appointment.location ? (
            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {appointment.location}
            </p>
          ) : null}

          {!compact && appointment.notes ? (
            <p className="mt-3 rounded-xl bg-muted/55 px-3.5 py-3 text-sm leading-6 text-muted-foreground">
              {appointment.notes}
            </p>
          ) : null}

          {!compact && appointment.status !== "cancelled" && appointment.status !== "completed" ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <ResponseState label="Вы" value={ownResponse} />
              <ResponseState label="Вторая сторона" value={otherResponse} />
            </div>
          ) : null}
        </div>

        {!compact && (canRespond || canCancel || canComplete) ? (
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border pt-4 lg:max-w-[280px] lg:justify-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            {canRespond ? (
              <>
                <form action={respondProjectAppointment}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="response" value="accepted" />
                  <button type="submit" className="min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-[#076c47]">
                    Подтвердить
                  </button>
                </form>
                <form action={respondProjectAppointment}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="response" value="declined" />
                  <button type="submit" className="min-h-10 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/25 hover:text-primary">
                    Отклонить
                  </button>
                </form>
              </>
            ) : null}

            {canComplete ? (
              <form action={completeProjectAppointment}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <button type="submit" className="min-h-10 rounded-xl border border-primary/30 bg-secondary px-4 text-sm font-bold text-primary">
                  Отметить проведённой
                </button>
              </form>
            ) : null}

            {canCancel ? (
              <form action={cancelProjectAppointment}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <button type="submit" className="min-h-10 rounded-xl px-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10">
                  Отменить
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: ProjectAppointment["status"] }) {
  const tone =
    status === "confirmed"
      ? "bg-emerald-500/10 text-emerald-700"
      : status === "cancelled"
        ? "bg-destructive/10 text-destructive"
        : status === "completed"
          ? "bg-primary/10 text-primary"
          : "bg-amber-500/10 text-amber-700";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>
      {status === "confirmed" || status === "completed" ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : status === "cancelled" ? (
        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {statusLabels[status]}
    </span>
  );
}

function ResponseState({ label, value }: { label: string; value: ProjectAppointment["customerResponse"] }) {
  const accepted = value === "accepted";
  const declined = value === "declined";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/70 px-3 py-2.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span
        className={[
          "inline-flex items-center gap-1 text-xs font-bold",
          accepted ? "text-primary" : declined ? "text-destructive" : "text-amber-700",
        ].join(" ")}
      >
        {accepted ? (
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        ) : declined ? (
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {responseLabel(value)}
      </span>
    </div>
  );
}

function Metric({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div>
      <p className="mt-2 text-xl font-black tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
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
