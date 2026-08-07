import Link from "next/link";
import {
  ArrowLeft,
  Hammer,
} from "lucide-react";

type Props = {
  title?: string;
  description?: string;
};

export function ProjectFormHeader({
  title = "Создание проекта",
  description = "Расскажите о задаче, бюджете и сроках. Чем подробнее информация, тем точнее будут предложения подрядчиков.",
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative">
        <Link
          href="/customer/projects"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Мои проекты
        </Link>

        <div className="mt-7 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_25px_rgba(107,70,50,0.2)]">
            <Hammer className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-primary">
              Новый объект
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-4xl">
              {title}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}