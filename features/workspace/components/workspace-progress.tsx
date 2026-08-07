import {
  CheckCircle2,
  CircleDashed,
  TriangleAlert,
} from "lucide-react";

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
  /*
   * Этап считается выполненным
   * только после его приёмки заказчиком.
   */
  const completedStages =
    stages.filter(
      (stage) =>
        stage.status === "completed"
    );

  /*
   * Общая сумма долей всех созданных этапов.
   *
   * Например:
   * фундамент = 35
   * стены = 30
   * кровля = 20
   * отделка = 15
   *
   * Итого = 100
   */
  const totalWeight =
    stages.reduce(
      (sum, stage) =>
        sum +
        Number(
          stage.progress_weight ??
            0
        ),
      0
    );

  /*
   * Складываем только доли
   * ЗАВЕРШЁННЫХ этапов.
   *
   * ВАЖНО:
   * progress_weight уже является
   * процентом от всего проекта.
   */
  const completedWeight =
    completedStages.reduce(
      (sum, stage) =>
        sum +
        Number(
          stage.progress_weight ??
            0
        ),
      0
    );

  /*
   * Правильная формула.
   *
   * Если завершён этап с долей 35%,
   * прогресс проекта = 35%.
   *
   * Не делим completedWeight
   * на totalWeight.
   */
  const progress =
    Math.min(
      Math.max(
        Math.round(
          completedWeight
        ),
        0
      ),
      100
    );

  const remainingStages =
    Math.max(
      stages.length -
        completedStages.length,
      0
    );

  const remainingProgress =
    Math.max(
      100 - progress,
      0
    );

  return (
    <div className="space-y-6">
      {/* Основные показатели */}

      <div className="grid gap-4 md:grid-cols-3">
        <ProgressMetric
          label="Выполнено"
          value={`${progress}%`}
          description="Общий прогресс проекта"
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
          emphasized
        />

        <ProgressMetric
          label="Завершено этапов"
          value={`${completedStages.length}`}
          description={`из ${stages.length}`}
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
        />

        <ProgressMetric
          label="Осталось"
          value={`${remainingProgress}%`}
          description={
            stages.length > 0
              ? `${remainingStages} этапов не завершено`
              : "этапы не созданы"
          }
          icon={
            <CircleDashed className="h-5 w-5" />
          }
        />
      </div>

      {/* Основная шкала */}

      <div className="rounded-[1.5rem] border border-border bg-background/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Общий прогресс
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Рассчитывается по долям
              принятых заказчиком этапов.
            </p>
          </div>

          <p className="text-2xl font-bold tracking-tight text-primary">
            {progress}%
          </p>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>0%</span>

          <span>
            Выполнено {progress}%
          </span>

          <span>100%</span>
        </div>
      </div>

      {/* Информация о сформированном плане */}

      {stages.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs text-muted-foreground">
              Доля созданных этапов
            </p>

            <p className="mt-2 text-xl font-bold text-foreground">
              {totalWeight}%
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs text-muted-foreground">
              Доля завершённых этапов
            </p>

            <p className="mt-2 text-xl font-bold text-primary">
              {completedWeight}%
            </p>
          </div>
        </div>
      )}

      {/* Этапов ещё нет */}

      {stages.length === 0 && (
        <div className="rounded-[1.25rem] border border-dashed border-border bg-secondary/30 p-5">
          <div className="flex items-start gap-3">
            <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <div>
              <p className="text-sm font-semibold text-foreground">
                План этапов пока не сформирован
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                После добавления этапов здесь
                появится фактический прогресс
                выполнения проекта.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* План сформирован не полностью */}

      {totalWeight > 0 &&
        totalWeight < 100 && (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="text-sm font-semibold">
                  План проекта сформирован
                  не полностью
                </p>

                <p className="mt-1 text-sm leading-6 opacity-85">
                  Сейчас между этапами
                  распределено{" "}
                  <strong>
                    {totalWeight}%
                  </strong>{" "}
                  проекта.

                  Осталось распределить{" "}
                  <strong>
                    {100 -
                      totalWeight}
                    %
                  </strong>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Ошибка — сумма больше 100 */}

      {totalWeight > 100 && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Доли этапов превышают
                100%
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                Сейчас сумма долей
                составляет{" "}
                <strong>
                  {totalWeight}%
                </strong>
                .

                Необходимо уменьшить
                доли этапов на{" "}
                <strong>
                  {totalWeight -
                    100}
                  %
                </strong>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Всё правильно */}

      {totalWeight === 100 && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                План проекта сформирован
                полностью
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                Между этапами распределено
                100% объёма проекта.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressMetric({
  label,
  value,
  description,
  icon,
  emphasized = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[1.4rem] border border-border p-5",
        emphasized
          ? "bg-secondary/60"
          : "bg-background/60",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-2xl",
          emphasized
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-primary",
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>

      <p
        className={[
          "mt-2 font-bold tracking-[-0.04em]",
          emphasized
            ? "text-4xl text-primary"
            : "text-3xl text-foreground",
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}