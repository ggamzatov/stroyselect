type Props = {
  status: string;
};

export function StageStatusBadge({
  status,
}: Props) {
  const config =
    getStageStatusConfig(status);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
        config.className,
      ].join(" ")}
    >
      <span
        className={[
          "mr-2 h-2 w-2 rounded-full",
          config.dotClassName,
        ].join(" ")}
      />

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
          "bg-secondary text-secondary-foreground",
        dotClassName:
          "bg-primary",
      };

    case "in_progress":
      return {
        label: "Выполняется",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        dotClassName:
          "bg-amber-500",
      };

    case "awaiting_review":
      return {
        label: "На проверке",
        className:
          "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
        dotClassName:
          "bg-violet-500",
      };

    case "revision_required":
      return {
        label: "Требуются исправления",
        className:
          "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
        dotClassName:
          "bg-orange-500",
      };

    case "completed":
      return {
        label: "Завершён",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName:
          "bg-emerald-500",
      };

    case "cancelled":
      return {
        label: "Отменён",
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        dotClassName:
          "bg-red-500",
      };

    default:
      return {
        label: status,
        className:
          "bg-muted text-muted-foreground",
        dotClassName:
          "bg-muted-foreground",
      };
  }
}