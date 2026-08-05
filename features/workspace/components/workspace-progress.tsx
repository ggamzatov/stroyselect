type Stage = {
  id: string;
  status: string;
  progress_weight: number;
};

type Props = {
  stages: Stage[];
};

export function WorkspaceProgress({
  stages,
}: Props) {
  const completedStages =
    stages.filter(
      (stage) =>
        stage.status === "completed"
    );

  const totalWeight =
    stages.reduce(
      (sum, stage) =>
        sum +
        Number(
          stage.progress_weight ?? 0
        ),
      0
    );

  const completedWeight =
    completedStages.reduce(
      (sum, stage) =>
        sum +
        Number(
          stage.progress_weight ?? 0
        ),
      0
    );

  const progress =
    totalWeight > 0
      ? Math.round(
          (completedWeight /
            totalWeight) *
            100
        )
      : stages.length > 0
        ? Math.round(
            (completedStages.length /
              stages.length) *
              100
          )
        : 0;

  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            Прогресс проекта
          </p>

          <p className="mt-1 text-3xl font-bold">
            {progress}%
          </p>
        </div>

        <p className="text-sm font-medium text-slate-600">
          Завершено этапов:{" "}
          {completedStages.length} из{" "}
          {stages.length}
        </p>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-700 transition-all"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      {stages.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          План этапов пока не сформирован.
        </p>
      )}

      {totalWeight > 0 &&
        totalWeight !== 100 && (
          <p className="mt-4 text-sm text-amber-700">
            Сумма долей этапов составляет{" "}
            {totalWeight}%. Рекомендуем
            привести её к 100%.
          </p>
        )}
    </section>
  );
}