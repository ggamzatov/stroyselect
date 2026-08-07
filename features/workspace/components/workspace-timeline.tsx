import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileText,
  Flag,
  MessageCircle,
  Play,
  RotateCcw,
  UserCheck,
} from "lucide-react";

type ProjectEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

type Props = {
  events: ProjectEvent[];
};

export function WorkspaceTimeline({
  events,
}: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Flag className="h-5 w-5" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-foreground">
          История пока пуста
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ключевые действия и изменения по проекту
          будут автоматически появляться здесь.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-5 left-[21px] top-5 w-px bg-border" />

      <div className="space-y-6">
        {events.map(
          (event, index) => {
            const config =
              getEventConfig(
                event.event_type
              );

            const Icon =
              config.icon;

            return (
              <article
                key={event.id}
                className="relative flex gap-4"
              >
                <div
                  className={[
                    "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                    config.iconClassName,
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1 pb-2">
                  <div className="rounded-[1.35rem] border border-border bg-background/60 p-4 transition hover:border-primary/20 hover:shadow-[var(--shadow-soft)]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                          {config.label}
                        </p>

                        <h3 className="mt-1 text-sm font-bold text-foreground md:text-base">
                          {event.title}
                        </h3>
                      </div>

                      <time
                        dateTime={
                          event.created_at
                        }
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        {formatDateTime(
                          event.created_at
                        )}
                      </time>
                    </div>

                    {event.description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {
                          event.description
                        }
                      </p>
                    )}

                    <div className="mt-3 text-[11px] text-muted-foreground">
                      Событие {index + 1} из{" "}
                      {events.length}
                    </div>
                  </div>
                </div>
              </article>
            );
          }
        )}
      </div>
    </div>
  );
}

function getEventConfig(
  eventType: string
) {
  const normalized =
    eventType.toLowerCase();

  if (
    normalized.includes(
      "stage_completed"
    ) ||
    normalized.includes(
      "completed"
    ) ||
    normalized.includes(
      "approved"
    )
  ) {
    return {
      label:
        "Завершение",
      icon:
        CheckCircle2,
      iconClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    };
  }

  if (
    normalized.includes(
      "started"
    ) ||
    normalized.includes(
      "in_progress"
    )
  ) {
    return {
      label:
        "Начало работ",
      icon: Play,
      iconClassName:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
    };
  }

  if (
    normalized.includes(
      "revision"
    ) ||
    normalized.includes(
      "rejected"
    )
  ) {
    return {
      label:
        "Исправления",
      icon:
        RotateCcw,
      iconClassName:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300",
    };
  }

  if (
    normalized.includes(
      "dispute"
    ) ||
    normalized.includes(
      "error"
    ) ||
    normalized.includes(
      "cancel"
    )
  ) {
    return {
      label:
        "Важное событие",
      icon:
        AlertTriangle,
      iconClassName:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
    };
  }

  if (
    normalized.includes(
      "contractor"
    ) ||
    normalized.includes(
      "selected"
    )
  ) {
    return {
      label:
        "Подрядчик",
      icon:
        UserCheck,
      iconClassName:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300",
    };
  }

  if (
    normalized.includes(
      "message"
    ) ||
    normalized.includes(
      "comment"
    )
  ) {
    return {
      label:
        "Обсуждение",
      icon:
        MessageCircle,
      iconClassName:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300",
    };
  }

  if (
    normalized.includes(
      "file"
    ) ||
    normalized.includes(
      "document"
    )
  ) {
    return {
      label:
        "Документы",
      icon:
        FileText,
      iconClassName:
        "border-border bg-secondary text-primary",
    };
  }

  return {
    label:
      "Событие проекта",
    icon: Circle,
    iconClassName:
      "border-border bg-secondary text-primary",
  };
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}