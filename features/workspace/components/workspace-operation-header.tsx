import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Metric = {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "default" | "green" | "amber" | "red" | "blue";
};

type Props = {
  backHref: string;
  kicker: string;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  metrics?: Metric[];
};

export function WorkspaceOperationHeader({
  backHref,
  kicker,
  title,
  description,
  icon,
  metrics = [],
}: Props) {
  return (
    <>
      <Link
        href={backHref}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-sm font-bold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Вернуться к проекту
      </Link>

      <section className="ui-v2-panel relative mt-3 overflow-hidden p-5 sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[32%] bg-[radial-gradient(circle_at_72%_35%,rgba(170,216,190,0.5),transparent_62%)] lg:block" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary shadow-sm">
              {icon}
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.1em] text-primary">
              {kicker}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </div>
          </div>

          {metrics.length > 0 ? (
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-0 rounded-xl border border-border bg-card/88 px-3 py-2.5 backdrop-blur"
                >
                  <div className="flex items-center gap-1.5">
                    {metric.icon ? (
                      <span className={metricTone(metric.tone)}>{metric.icon}</span>
                    ) : null}
                    <span className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                      {metric.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-base font-black tracking-[-0.02em] text-foreground">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function metricTone(tone: Metric["tone"] = "default") {
  switch (tone) {
    case "green":
      return "text-emerald-600";
    case "amber":
      return "text-amber-600";
    case "red":
      return "text-red-600";
    case "blue":
      return "text-blue-600";
    default:
      return "text-primary";
  }
}
