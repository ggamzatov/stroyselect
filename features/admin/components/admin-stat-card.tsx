import {
  ArrowUpRight,
} from "lucide-react";

type Props = {
  title: string;

  value: number;

  description:
    string;

  icon:
    React.ReactNode;

  attention?:
    boolean;
};

export function AdminStatCard({
  title,
  value,
  description,
  icon,
  attention = false,
}: Props) {
  return (
    <div className="group relative overflow-hidden rounded-[1.6rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-secondary/70 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <span
            className={[
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              attention
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : "bg-secondary text-primary",
            ].join(" ")}
          >
            {icon}
          </span>

          <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition group-hover:text-primary" />
        </div>

        <p className="mt-6 text-3xl font-black tracking-[-0.04em] text-foreground">
          {value}
        </p>

        <p className="mt-1 text-sm font-semibold text-foreground">
          {title}
        </p>

        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}