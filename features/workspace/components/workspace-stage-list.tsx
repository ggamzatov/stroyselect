import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Circle,
  Play,
  RotateCcw,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { StageStatusBadge } from
  "@/features/workspace/components/stage-status-badge";

type Stage = {
  id: string;
  title: string;
  description: string | null;
  price: number | string | null;
  progress_weight: number;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_started_at?: string | null;
  actual_completed_at?: string | null;
  customer_review_comment: string | null;
  submitted_for_review_at: string | null;
};

type Props = {
  stages: Stage[];
};

export function WorkspaceStageList({
  stages,
}: Props) {
  if (stages.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Circle className="h-5 w-5" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-foreground">
          Этапы пока не добавлены
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          После формирования плана работ этапы
          будут отображаться здесь.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stages.map(
        (stage, index) => (
          <article
            key={stage.id}
            className="rounded-[1.5rem] border border-border bg-background/60 p-5 transition hover:border-primary/20 hover:shadow-[var(--shadow-soft)] md:p-6"
          >
            <div className="flex items-start gap-4">
              <StageIcon
                status={
                  stage.status
                }
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Этап {index + 1}
                    </p>

                    <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground md:text-xl">
                      {stage.title}
                    </h3>
                  </div>

                  <StageStatusBadge
                    status={
                      stage.status
                    }
                  />
                </div>

                {stage.description && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {stage.description}
                  </p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StageInfo
                    icon={
                      <Banknote className="h-4 w-4" />
                    }
                    label="Стоимость"
                    value={formatMoney(
                      stage.price
                    )}
                    emphasized
                  />

                  <StageInfo
                    icon={
                      <CheckCircle2 className="h-4 w-4" />
                    }
                    label="Доля проекта"
                    value={`${stage.progress_weight}%`}
                  />

                  <StageInfo
                    icon={
                      <CalendarDays className="h-4 w-4" />
                    }
                    label="Плановые даты"
                    value={formatStageDates(
                      stage.planned_start_date,
                      stage.planned_end_date
                    )}
                  />
                </div>

                {(stage.actual_started_at ||
                  stage.actual_completed_at ||
                  stage.submitted_for_review_at) && (
                  <div className="mt-5 rounded-[1.25rem] border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Фактический ход этапа
                    </p>

                    <div className="mt-4 space-y-3">
                      {stage.actual_started_at && (
                        <TimelineInfo
                          icon={
                            <Play className="h-4 w-4" />
                          }
                          label="Фактически начат"
                          value={formatDateTime(
                            stage.actual_started_at
                          )}
                        />
                      )}

                      {stage.submitted_for_review_at && (
                        <TimelineInfo
                          icon={
                            <Clock3 className="h-4 w-4" />
                          }
                          label="Отправлен на проверку"
                          value={formatDateTime(
                            stage.submitted_for_review_at
                          )}
                        />
                      )}

                      {stage.actual_completed_at && (
                        <TimelineInfo
                          icon={
                            <CheckCircle2 className="h-4 w-4" />
                          }
                          label="Фактически завершён"
                          value={formatDateTime(
                            stage.actual_completed_at
                          )}
                        />
                      )}
                    </div>
                  </div>
                )}

                {stage.customer_review_comment && (
                  <div className="mt-5 rounded-[1.25rem] border border-orange-200 bg-orange-50 p-4 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
                    <div className="flex items-start gap-3">
                      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                      <div>
                        <p className="text-sm font-semibold">
                          Замечание заказчика
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 opacity-85">
                          {
                            stage.customer_review_comment
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        )
      )}
    </div>
  );
}

function StageIcon({
  status,
}: {
  status: string;
}) {
  const config =
    getStageIconConfig(
      status
    );

  const Icon =
    config.icon;

  return (
    <div
      className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
        config.className,
      ].join(" ")}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function getStageIconConfig(
  status: string
) {
  switch (status) {
    case "in_progress":
      return {
        icon: Play,
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      };

    case "awaiting_review":
      return {
        icon: Clock3,
        className:
          "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
      };

    case "revision_required":
      return {
        icon: RotateCcw,
        className:
          "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
      };

    case "completed":
      return {
        icon: CheckCircle2,
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      };

    case "cancelled":
      return {
        icon: XCircle,
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
      };

    default:
      return {
        icon: Circle,
        className:
          "bg-secondary text-primary",
      };
  }
}

function StageInfo({
  icon,
  label,
  value,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-border p-4",
        emphasized
          ? "bg-secondary/60"
          : "bg-card",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary">
          {icon}
        </span>

        <p className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
      </div>

      <p
        className={[
          "mt-2 leading-5 text-foreground",
          emphasized
            ? "text-base font-bold"
            : "text-sm font-semibold",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function TimelineInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </div>

      <div>
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="mt-0.5 text-sm font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatMoney(
  value:
    | number
    | string
    | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Стоимость не указана";
  }

  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return "Стоимость не указана";
  }

  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(
    numericValue
  );
}

function formatStageDates(
  start: string | null,
  end: string | null
) {
  if (!start && !end) {
    return "Не указаны";
  }

  if (
    start &&
    end
  ) {
    return `${formatDate(
      start
    )} — ${formatDate(
      end
    )}`;
  }

  if (start) {
    return `С ${formatDate(
      start
    )}`;
  }

  return `До ${formatDate(
    end!
  )}`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}