import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";

import type { WorkspaceStage } from
  "@/features/workspace/types/stage";

import { StageStatusBadge } from
  "@/features/workspace/components/stage-status-badge";

type Props = {
  stage: WorkspaceStage;
  index: number;

  isPending: boolean;
  isCurrentPending: boolean;

  onEdit: (
    stageId: string
  ) => void;

  onDelete: (
    stage: WorkspaceStage
  ) => void;

  onAction: (
    stage: WorkspaceStage,
    action:
      | "start"
      | "submit"
      | "resume"
  ) => void;
};

export function ContractorStageCard({
  stage,
  index,
  isPending,
  isCurrentPending,
  onEdit,
  onDelete,
  onAction,
}: Props) {
  return (
    <article className="rounded-[1.5rem] border border-border bg-background/60 p-5 transition hover:border-primary/20 hover:shadow-[var(--shadow-soft)] md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-secondary px-2 text-xs font-bold text-primary">
              {index + 1}
            </span>

            <StageStatusBadge
              status={stage.status}
            />
          </div>

          <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground md:text-xl">
            {stage.title}
          </h3>

          {stage.description && (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {stage.description}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StageInfo
              icon={
                <Banknote className="h-4 w-4" />
              }
              label="Стоимость"
              value={formatMoney(
                stage.price
              )}
            />

            <StageInfo
              icon={
                <CheckCircle2 className="h-4 w-4" />
              }
              label="Доля прогресса"
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
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[260px] lg:justify-end">
          {stage.status ===
            "planned" && (
            <>
              <StageButton
                disabled={isPending}
                onClick={() =>
                  onAction(
                    stage,
                    "start"
                  )
                }
                variant="primary"
                icon={
                  isCurrentPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )
                }
              >
                {isCurrentPending
                  ? "Сохраняем..."
                  : "Начать этап"}
              </StageButton>

              <StageButton
                disabled={isPending}
                onClick={() =>
                  onEdit(stage.id)
                }
                icon={
                  <Edit3 className="h-4 w-4" />
                }
              >
                Изменить
              </StageButton>

              <StageButton
                disabled={isPending}
                onClick={() =>
                  onDelete(stage)
                }
                variant="danger"
                icon={
                  isCurrentPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )
                }
              >
                {isCurrentPending
                  ? "Удаляем..."
                  : "Удалить"}
              </StageButton>
            </>
          )}

          {stage.status ===
            "in_progress" && (
            <StageButton
              disabled={isPending}
              onClick={() =>
                onAction(
                  stage,
                  "submit"
                )
              }
              variant="primary"
              icon={
                isCurrentPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )
              }
            >
              {isCurrentPending
                ? "Отправляем..."
                : "На проверку"}
            </StageButton>
          )}

          {stage.status ===
            "awaiting_review" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300">
              Ожидает проверки заказчика
            </div>
          )}

          {stage.status ===
            "revision_required" && (
            <StageButton
              disabled={isPending}
              onClick={() =>
                onAction(
                  stage,
                  "resume"
                )
              }
              variant="warning"
              icon={
                isCurrentPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )
              }
            >
              {isCurrentPending
                ? "Сохраняем..."
                : "Исправить замечания"}
            </StageButton>
          )}

          {stage.status ===
            "completed" && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Этап завершён
            </div>
          )}

          {stage.status ===
            "cancelled" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              Этап отменён
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function StageInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}

        <p className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
      </div>

      <p className="mt-2 text-sm font-semibold leading-5 text-foreground">
        {value}
      </p>
    </div>
  );
}

function StageButton({
  children,
  icon,
  disabled,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant?:
    | "default"
    | "primary"
    | "warning"
    | "danger";
}) {
  const styles = {
    default:
      "border border-border bg-card text-foreground hover:border-primary/25 hover:bg-secondary/50",

    primary:
      "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(107,70,50,0.16)] hover:-translate-y-0.5 hover:bg-[#5c3b2a]",

    warning:
      "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",

    danger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition",
        "disabled:pointer-events-none disabled:opacity-50",
        styles[variant],
      ].join(" ")}
    >
      {icon}

      {children}
    </button>
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
    return "Не указана";
  }

  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return "Не указана";
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