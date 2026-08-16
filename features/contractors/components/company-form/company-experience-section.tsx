import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  PauseCircle,
  UsersRound,
} from "lucide-react";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { ContractorCompanyFormInput } from "@/features/contractors/schemas/contractor-company-schema";

type Props = {
  register: UseFormRegister<ContractorCompanyFormInput>;
  errors: FieldErrors<ContractorCompanyFormInput>;
  disabled: boolean;
  acceptsNewProjects: boolean;
  availabilityPending: boolean;
  onAvailabilityChange: (value: boolean) => void;
};

export function CompanyExperienceSection({
  register,
  errors,
  disabled,
  acceptsNewProjects,
  availabilityPending,
  onAvailabilityChange,
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <SectionHeader />

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <NumberField field="foundedYear" label="Год начала работы" required error={errors.foundedYear?.message} icon={<CalendarDays className="h-4 w-4" />}>
          <input
            type="number"
            disabled={disabled}
            className={inputClass(Boolean(errors.foundedYear))}
            placeholder="Например, 2018"
            {...register("foundedYear")}
          />
        </NumberField>

        <NumberField field="employeeCount" label="Количество сотрудников" required error={errors.employeeCount?.message} icon={<UsersRound className="h-4 w-4" />}>
          <input
            type="number"
            min={1}
            disabled={disabled}
            className={inputClass(Boolean(errors.employeeCount))}
            placeholder="Например, 8"
            {...register("employeeCount")}
          />
        </NumberField>

        <NumberField field="minimumProjectBudget" label="Минимальный бюджет проекта" icon={<Banknote className="h-4 w-4" />}>
          <input type="number" min={0} disabled={disabled} className="stroy-input" {...register("minimumProjectBudget")} />
        </NumberField>

        <NumberField field="maximumProjectBudget" label="Максимальный бюджет проекта" error={errors.maximumProjectBudget?.message} icon={<Banknote className="h-4 w-4" />}>
          <input type="number" min={1} disabled={disabled} className={inputClass(Boolean(errors.maximumProjectBudget))} {...register("maximumProjectBudget")} />
        </NumberField>
      </div>

      <div className="mt-6 rounded-[1.4rem] border border-border bg-background/60 p-4" data-company-field="acceptsNewProjects">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Доступность для новых проектов</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Этот статус видят заказчики и администрация. Его можно менять даже после подтверждения профиля.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={availabilityPending}
              onClick={() => onAvailabilityChange(true)}
              className={[
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60",
                acceptsNewProjects
                  ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/10 dark:bg-emerald-950/35 dark:text-emerald-300"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Принимаю новые проекты
            </button>

            <button
              type="button"
              disabled={availabilityPending}
              onClick={() => onAvailabilityChange(false)}
              className={[
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60",
                !acceptsNewProjects
                  ? "border-amber-500/40 bg-amber-50 text-amber-800 ring-2 ring-amber-500/10 dark:bg-amber-950/35 dark:text-amber-300"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <PauseCircle className="h-4 w-4" />
              Не принимаю новые проекты
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function inputClass(hasError: boolean) {
  return ["stroy-input", hasError ? "border-destructive ring-2 ring-destructive/15 focus:border-destructive" : ""].join(" ");
}

function SectionHeader() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary"><BriefcaseBusiness className="h-5 w-5" /></div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Опыт и возможности</h2>
        <p className="mt-1 text-sm text-muted-foreground">Год начала работы и количество сотрудников обязательны. Бюджет можно не указывать.</p>
      </div>
    </div>
  );
}

function NumberField({ field, label, required, error, icon, children }: { field?: string; label: string; required?: boolean; error?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div data-company-field={field}>
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <label className="text-sm font-semibold text-foreground">
          {label}{required && <span className="ml-1 text-destructive">*</span>}
        </label>
      </div>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-2 text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
