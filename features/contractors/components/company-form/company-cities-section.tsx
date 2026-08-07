import {
  Check,
  MapPin,
} from "lucide-react";

import { DAGESTAN_CITIES } from
  "@/features/contractors/constants/cities";

type Props = {
  selectedCities:
    string[];

  disabled: boolean;

  error?: string;

  onToggle:
    (city: string) => void;
};

export function CompanyCitiesSection({
  selectedCities,
  disabled,
  error,
  onToggle,
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
          <MapPin className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">
            Города работы
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Выберите населённые пункты, где компания готова выполнять проекты.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {DAGESTAN_CITIES.map(
          (city) => {
            const selected =
              selectedCities.includes(
                city
              );

            return (
              <button
                key={city}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onToggle(city)
                }
                className={[
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/60 text-foreground hover:border-primary/30 hover:bg-secondary",
                  disabled
                    ? "cursor-not-allowed opacity-60"
                    : "",
                ].join(" ")}
              >
                {selected && (
                  <Check className="h-3.5 w-3.5" />
                )}

                {city}
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