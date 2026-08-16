import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  UsersRound,
} from "lucide-react";

import type {
  UseFormRegister,
} from "react-hook-form";

import type {
  ContractorCompanyFormInput,
} from "@/features/contractors/schemas/contractor-company-schema";

type Props = {
  register:
    UseFormRegister<ContractorCompanyFormInput>;

  disabled: boolean;
};

export function CompanyExperienceSection({
  register,
  disabled,
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <SectionHeader />

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <NumberField
          label="Год начала работы"
          icon={
            <CalendarDays className="h-4 w-4" />
          }
        >
          <input
            type="number"
            disabled={disabled}
            className="stroy-input"
            {...register(
              "foundedYear"
            )}
          />
        </NumberField>

        <NumberField
          label="Количество сотрудников"
          icon={
            <UsersRound className="h-4 w-4" />
          }
        >
          <input
            type="number"
            disabled={disabled}
            className="stroy-input"
            {...register(
              "employeeCount"
            )}
          />
        </NumberField>

        <NumberField
          label="Минимальный бюджет проекта"
          icon={
            <Banknote className="h-4 w-4" />
          }
        >
          <input
            type="number"
            disabled={disabled}
            className="stroy-input"
            {...register(
              "minimumProjectBudget"
            )}
          />
        </NumberField>

        <NumberField
          label="Максимальный бюджет проекта"
          icon={
            <Banknote className="h-4 w-4" />
          }
        >
          <input
            type="number"
            disabled={disabled}
            className="stroy-input"
            {...register(
              "maximumProjectBudget"
            )}
          />
        </NumberField>
      </div>

      <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-[1.25rem] border border-border bg-background/60 p-4">
        <input
          type="checkbox"
          disabled={disabled}
          className="h-5 w-5 accent-[var(--primary)]"
          {...register(
            "acceptsNewProjects"
          )}
        />

        <div>
          <p className="text-sm font-semibold text-foreground">
            Сейчас принимаем новые проекты
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Ваш профиль будет участвовать
            в подборе новых заказов.
          </p>
        </div>
      </label>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        <BriefcaseBusiness className="h-5 w-5" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">
          Опыт и возможности
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Опыт компании и диапазон подходящих проектов.
        </p>
      </div>
    </div>
  );
}

function NumberField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-primary">
          {icon}
        </span>

        <label className="text-sm font-semibold text-foreground">
          {label}
        </label>
      </div>

      <div className="mt-2">
        {children}
      </div>
    </div>
  );
}