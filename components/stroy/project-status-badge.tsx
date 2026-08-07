// components/stroy/project-status-badge.tsx

import { StroyBadge } from "@/components/ui/stroy-badge";

type ProjectStatus =
  | "draft"
  | "published"
  | "matching"
  | "contractor_selected"
  | "in_progress"
  | "completed"
  | "disputed";

type Props = {
  status: ProjectStatus;
};

const statusMap = {
  draft: {
    label: "Черновик",
    variant: "muted" as const,
  },
  published: {
    label: "Опубликован",
    variant: "success" as const,
  },
  matching: {
    label: "Идет подбор",
    variant: "warning" as const,
  },
  contractor_selected: {
    label: "Подрядчик выбран",
    variant: "default" as const,
  },
  in_progress: {
    label: "В работе",
    variant: "default" as const,
  },
  completed: {
    label: "Завершен",
    variant: "success" as const,
  },
  disputed: {
    label: "Спор",
    variant: "danger" as const,
  },
};

export function ProjectStatusBadge({
  status,
}: Props) {
  const item = statusMap[status];

  return (
    <StroyBadge variant={item.variant}>
      {item.label}
    </StroyBadge>
  );
}