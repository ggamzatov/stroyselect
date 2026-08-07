import type {
  ReactNode,
} from "react";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function FormSection({
  title,
  description,
  icon,
  children,
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {title}
          </h2>

          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-7">
        {children}
      </div>
    </section>
  );
}