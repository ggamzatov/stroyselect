// components/stroy/project-card.tsx

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  MessageSquare,
} from "lucide-react";

import { StroyCard } from "@/components/ui/stroy-card";
import { ProjectStatusBadge } from "@/components/stroy/project-status-badge";

type Props = {
  id: string;
  title: string;
  city: string;
  budget?: string | null;
  offersCount?: number;
  status:
    | "draft"
    | "published"
    | "matching"
    | "contractor_selected"
    | "in_progress"
    | "completed"
    | "disputed";
  desiredStartDate?: string | null;
  href?: string;
};

export function ProjectCard({
  id,
  title,
  city,
  budget,
  offersCount = 0,
  status,
  desiredStartDate,
  href,
}: Props) {
  return (
    <Link
      href={href ?? `/customer/work/${id}`}
      className="block"
    >
      <StroyCard
        interactive
        className="group h-full p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <ProjectStatusBadge status={status} />

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
          {title}
        </h3>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {city}
          </div>

          {desiredStartDate && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {desiredStartDate}
            </div>
          )}
        </div>

        <div className="my-5 h-px bg-border" />

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Бюджет
            </p>

            <p className="mt-1 text-lg font-bold text-foreground">
              {budget ?? "Не указан"}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
            <MessageSquare className="h-4 w-4" />
            {offersCount}
          </div>
        </div>
      </StroyCard>
    </Link>
  );
}