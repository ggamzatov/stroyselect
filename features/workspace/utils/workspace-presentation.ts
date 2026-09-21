type StageLike = {
  id: string;
  status: string;
  progress_weight: number | string | null;
};

export type WorkspaceRole = "customer" | "contractor";

export function getProjectStatusPresentation(status: string) {
  const states: Record<string, { label: string; className: string }> = {
    draft: { label: "Черновик", className: "bg-muted text-muted-foreground" },
    published: { label: "Опубликован", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200" },
    matching: { label: "Идёт подбор подрядчика", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200" },
    contractor_selected: { label: "Подрядчик выбран", className: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200" },
    in_progress: { label: "В работе", className: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" },
    completed: { label: "Проект завершён", className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" },
    disputed: { label: "Есть спор", className: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" },
    cancelled: { label: "Проект отменён", className: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" },
  };

  return states[status] ?? { label: "Статус проекта уточняется", className: "bg-muted text-muted-foreground" };
}

export function getStageStatusPresentation(status: string) {
  const states: Record<string, string> = {
    planned: "Запланирован",
    in_progress: "В работе",
    awaiting_review: "Готов к проверке",
    revision_required: "Требуются исправления",
    completed: "Принят",
    cancelled: "Отменён",
  };

  return states[status] ?? "Статус уточняется";
}

export function getWorkspaceProgress(stages: StageLike[]) {
  const completed = stages.filter((stage) => stage.status === "completed");
  const totalWeight = stages.reduce((sum, stage) => sum + Number(stage.progress_weight ?? 0), 0);
  const completedWeight = completed.reduce((sum, stage) => sum + Number(stage.progress_weight ?? 0), 0);

  return {
    completedCount: completed.length,
    totalCount: stages.length,
    // Existing stage weights are the authoritative project share. Do not render a made-up percentage.
    percentage: totalWeight > 0 ? Math.min(Math.max(Math.round(completedWeight), 0), 100) : null,
  };
}

export function getCurrentStage<T extends StageLike>(stages: T[], role: WorkspaceRole) {
  const active = stages.filter((stage) => stage.status !== "completed" && stage.status !== "cancelled");

  if (role === "customer") {
    return active.find((stage) => stage.status === "awaiting_review") ?? active[0] ?? null;
  }

  return (
    active.find((stage) => stage.status === "in_progress") ??
    active.find((stage) => stage.status === "revision_required") ??
    active.find((stage) => stage.status === "planned") ??
    active.find((stage) => stage.status === "awaiting_review") ??
    null
  );
}

export function formatWorkspaceDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`)
  );
}

export function formatWorkspaceMoney(value: number | string | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "Не указана";

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}
