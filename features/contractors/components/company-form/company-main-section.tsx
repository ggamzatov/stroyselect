import {
  Building2,
  FileText,
} from "lucide-react";

import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";

import type {
  ContractorCompanyFormInput,
} from "@/features/contractors/schemas/contractor-company-schema";

type Props = {
  register:
    UseFormRegister<ContractorCompanyFormInput>;

  errors:
    FieldErrors<ContractorCompanyFormInput>;

  disabled: boolean;
};

export function CompanyMainSection({
  register,
  errors,
  disabled,
}: Props) {
  return (
    <FormSection
      title="Основная информация"
      description="Название, юридические сведения и описание компании."
      icon={
        <Building2 className="h-5 w-5" />
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Публичное название"
          error={
            errors.publicName?.message
          }
        >
          <input
            disabled={disabled}
            className="stroy-input"
            placeholder="Например, СтройДом"
            {...register(
              "publicName"
            )}
          />
        </Field>

        <Field label="Тип подрядчика">
          <select
            disabled={disabled}
            className="stroy-select"
            {...register(
              "companyType"
            )}
          >
            <option value="individual">
              Частная бригада
            </option>

            <option value="self_employed">
              Самозанятый
            </option>

            <option value="entrepreneur">
              Индивидуальный предприниматель
            </option>

            <option value="company">
              Юридическое лицо
            </option>
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field label="Юридическое название">
            <input
              disabled={disabled}
              className="stroy-input"
              placeholder="ИП Иванов Иван Иванович"
              {...register(
                "legalName"
              )}
            />
          </Field>
        </div>

        <Field
          label="ИНН"
          error={
            errors.inn?.message
          }
        >
          <input
            disabled={disabled}
            inputMode="numeric"
            className="stroy-input"
            {...register("inn")}
          />
        </Field>

        <Field
          label="ОГРН или ОГРНИП"
          error={
            errors.ogrn?.message
          }
        >
          <input
            disabled={disabled}
            inputMode="numeric"
            className="stroy-input"
            {...register("ogrn")}
          />
        </Field>

        <div className="md:col-span-2">
          <Field
            label="О компании"
            description="Опишите опыт, команду, типы объектов и ваши сильные стороны."
            error={
              errors.description
                ?.message
            }
          >
            <textarea
              disabled={disabled}
              rows={7}
              className="stroy-textarea"
              placeholder="Расскажите об опыте компании..."
              {...register(
                "description"
              )}
            />
          </Field>
        </div>
      </div>
    </FormSection>
  );
}

function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground">
        {label}
      </label>

      {description && (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}

      <div className="mt-2">
        {children}
      </div>

      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}