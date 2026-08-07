// components/stroy/dashboard-stat-card.tsx

import type { ReactNode } from "react";

import { StroyCard } from "@/components/ui/stroy-card";

type Props = {
  title: string;
  value: number | string;
  icon: ReactNode;
  description?: string;
};

export function DashboardStatCard({
  title,
  value,
  icon,
  description,
}: Props) {
  return (
    <StroyCard
      interactive
      className="group p-6"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>

      <p className="mt-5 text-sm font-medium text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-4xl font-bold tracking-[-0.04em] text-foreground">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </StroyCard>
  );
}