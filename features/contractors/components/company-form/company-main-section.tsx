import { Building2 } from "lucide-react";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { ContractorCompanyFormInput } from "@/features/contractors/schemas/contractor-company-schema";

type Props = {
  register: UseFormRegister<ContractorCompanyFormInput>;
  errors: FieldErrors<ContractorCompanyFormInput>;
  disabled: boolean;
};

export function CompanyMainSection({ register, errors, disabled }: Props) {
  return (
    <FormSection
      title="Основная информация"
      description="Все поля этого раздела обязательны для отправки профиля на проверку."
      icon={<Building2 className="h-5 w-5" />}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field field="publicName" label="Публичное название" required error={errors.publicName?.message}>
          <input disabled={disabled} className={inputClass(Boolean(errors.publicName))} placeholder="Например, СтройДом" {...register("publicName")} />
        </Field>

        <Field field="companyType" label="Тип подрядчика" required error={errors.companyType?.message}>
          <select disabled={disabled} className={selectClass(Boolean(errors.companyType))} {...register("companyType")}>
            <option value="individual">Частная бригада</option>
            <option value="self_employed">Самозанятый</option>
            <option value="entrepreneur">Индивидуальный предприниматель</option>
            <option value="company">Юридическое лицо</option>
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field field="legalName" label="Юридическое название" required error={errors.legalName?.message}>
            <input disabled={disabled} className={inputClass(Boolean(errors.legalName))} placeholder="ИП Иванов Иван Иванович" {...register("legalName")} />
          </Field>
        </div>

        <Field field="inn" label="ИНН" required error={errors.inn?.message}>
          <input disabled={disabled} inputMode="numeric" className={inputClass(Boolean(errors.inn))} {...register("inn")} />
        </Field>

        <Field field="ogrn" label="ОГРН или ОГРНИП" required error={errors.ogrn?.message}>
          <input disabled={disabled} inputMode="numeric" className={inputClass(Boolean(errors.ogrn))} {...register("ogrn")} />
        </Field>

        <div className="md:col-span-2">
          <Field
            field="description"
            label="О компании"
            required
            description="Минимум 50 символов."
            error={errors.description?.message}
          >
            <textarea disabled={disabled} rows={7} className={textareaClass(Boolean(errors.description))} placeholder="Расскажите об опыте компании..." {...register("description")} />
          </Field>
        </div>
      </div>
    </FormSection>
  );
}

function inputClass(hasError: boolean) {
  return ["stroy-input", hasError ? "border-destructive ring-2 ring-destructive/15 focus:border-destructive" : ""].join(" ");
}
function selectClass(hasError: boolean) {
  return ["stroy-select", hasError ? "border-destructive ring-2 ring-destructive/15 focus:border-destructive" : ""].join(" ");
}
function textareaClass(hasError: boolean) {
  return ["stroy-textarea", hasError ? "border-destructive ring-2 ring-destructive/15 focus:border-destructive" : ""].join(" ");
}

function FormSection({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">{icon}</div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ field, label, required, description, error, children }: { field?: string; label: string; required?: boolean; description?: string; error?: string; children: React.ReactNode }) {
  return (
    <div data-company-field={field}>
      <label className="text-sm font-semibold text-foreground">
        {label}{required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
      <div className="mt-2">{children}</div>
      {error && <p className="mt-2 text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
