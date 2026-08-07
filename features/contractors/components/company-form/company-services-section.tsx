import {
  Check,
  Wrench,
} from "lucide-react";

import type {
  ContractorCategory,
} from "@/features/contractors/types/contractor-company-form";

type Props = {
  categories:
    ContractorCategory[];

  selectedIds:
    number[];

  disabled: boolean;

  error?: string;

  onToggle:
    (categoryId: number) => void;
};

export function CompanyServicesSection({
  categories,
  selectedIds,
  disabled,
  error,
  onToggle,
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Wrench className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">
            Специализации
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Выберите виды работ, которые выполняет ваша компания.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {categories.map(
          (category) => {
            const selected =
              selectedIds.includes(
                category.id
              );

            return (
              <button
                key={
                  category.id
                }
                type="button"
                disabled={
                  disabled
                }
                onClick={() =>
                  onToggle(
                    category.id
                  )
                }
                className={[
                  "flex min-h-16 items-center justify-between gap-3 rounded-[1.25rem] border p-4 text-left transition",
                  selected
                    ? "border-primary/40 bg-secondary text-foreground shadow-[var(--shadow-soft)]"
                    : "border-border bg-background/60 text-foreground hover:border-primary/20 hover:bg-secondary/30",
                  disabled
                    ? "cursor-not-allowed opacity-60"
                    : "",
                ].join(" ")}
              >
                <span className="font-semibold">
                  {
                    category.name
                  }
                </span>

                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  ].join(" ")}
                >
                  <Check className="h-4 w-4" />
                </span>
              </button>
            );
          }
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}