// components/stroy/contractor-card.tsx

import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Star,
} from "lucide-react";

import { StroyCard } from "@/components/ui/stroy-card";

type Props = {
  name: string;
  rating?: number;
  projectsCount?: number;
  verified?: boolean;
  services?: string[];
};

export function ContractorCard({
  name,
  rating = 0,
  projectsCount = 0,
  verified = false,
  services = [],
}: Props) {
  return (
    <StroyCard
      interactive
      className="group p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl font-bold text-primary">
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold text-foreground">
              {name}
            </h3>

            {verified && (
              <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-current" />
              {rating.toFixed(1)}
            </span>

            <span className="flex items-center gap-1">
              <BriefcaseBusiness className="h-4 w-4" />
              {projectsCount} проектов
            </span>
          </div>
        </div>
      </div>

      {services.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {services.slice(0, 3).map((service) => (
            <span
              key={service}
              className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
            >
              {service}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
        <span className="text-sm font-semibold text-primary">
          Открыть профиль
        </span>

        <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
      </div>
    </StroyCard>
  );
}