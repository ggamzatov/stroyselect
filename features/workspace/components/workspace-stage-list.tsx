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
};

type Props = {
  stages: Stage[];
};

export function WorkspaceStageList({
  stages,
}: Props) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">
        Этапы работ
      </h2>

      {stages.length === 0 ? (
        <div className="mt-5 rounded-xl bg-slate-50 p-5">
          <p className="font-medium">
            Этапы пока не добавлены
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Заказчик может сформировать план выполнения проекта.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {stages.map((stage, index) => (
            <article
              key={stage.id}
              className="rounded-xl border p-4"
            >
              <div className="flex items-start gap-4">
                <StageIcon status={stage.status} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Этап {index + 1}
                      </p>

                      <h3 className="mt-1 font-semibold">
                        {stage.title}
                      </h3>
                    </div>

                    <StageStatusBadge
                      status={stage.status}
                    />
                  </div>

                  {stage.description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {stage.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span className="font-semibold text-slate-900">
                      {formatMoney(stage.price)}
                    </span>

                    <span className="text-slate-600">
                      Доля проекта:{" "}
                      <strong>
                        {stage.progress_weight}%
                      </strong>
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    {formatStageDates(
                      stage.planned_start_date,
                      stage.planned_end_date
                    )}
                  </p>

                  {stage.actual_started_at && (
                    <p className="mt-2 text-xs text-slate-500">
                      Фактически начат:{" "}
                      {formatDateTime(
                        stage.actual_started_at
                      )}
                    </p>
                  )}

                  {stage.actual_completed_at && (
                    <p className="mt-2 text-xs text-slate-500">
                      Фактически завершён:{" "}
                      {formatDateTime(
                        stage.actual_completed_at
                      )}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StageIcon({
  status,
}: {
  status: string;
}) {
  const config = getStageIconConfig(status);

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${config.className}`}
    >
      {config.symbol}
    </span>
  );
}

function getStageIconConfig(
  status: string
) {
  switch (status) {
    case "in_progress":
      return {
        symbol: "▶",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "completed":
      return {
        symbol: "✓",
        className:
          "bg-green-100 text-green-800",
      };

    case "cancelled":
      return {
        symbol: "×",
        className:
          "bg-red-100 text-red-800",
      };

    default:
      return {
        symbol: "○",
        className:
          "bg-slate-100 text-slate-700",
      };
  }
}

function StageStatusBadge({
  status,
}: {
  status: string;
}) {
  const config =
    getStageStatusConfig(status);

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function getStageStatusConfig(
  status: string
) {
  switch (status) {
    case "planned":
      return {
        label: "Запланирован",
        className:
          "bg-slate-100 text-slate-700",
      };

    case "in_progress":
      return {
        label: "Выполняется",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "completed":
      return {
        label: "Завершён",
        className:
          "bg-green-100 text-green-800",
      };

    case "cancelled":
      return {
        label: "Отменён",
        className:
          "bg-red-100 text-red-800",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-700",
      };
  }
}

function formatMoney(
  value: number | string | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Стоимость не указана";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "Стоимость не указана";
  }

  return new Intl.NumberFormat(
    "ru-RU",
    {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }
  ).format(numericValue);
}

function formatStageDates(
  start: string | null,
  end: string | null
) {
  if (!start && !end) {
    return "Плановые даты не указаны";
  }

  if (start && end) {
    return `${formatDate(start)} — ${formatDate(end)}`;
  }

  if (start) {
    return `Начало: ${formatDate(start)}`;
  }

  return `Окончание: ${formatDate(end!)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
    }
  ).format(
    new Date(`${value}T00:00:00`)
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
  ).format(new Date(value));
}