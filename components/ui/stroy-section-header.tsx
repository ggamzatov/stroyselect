import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function StroySectionHeader({
  eyebrow,
  title,
  description,
  action,
}: Props) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="text-sm font-semibold text-primary">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}