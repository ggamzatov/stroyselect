import {
  Globe2,
  Mail,
  MessageCircle,
  Phone,
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

export function CompanyContactsSection({
  register,
  errors,
  disabled,
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Phone className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">
            Контактные данные
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Контакты для связи с заказчиками.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field
          icon={
            <Phone className="h-4 w-4" />
          }
          label="Телефон"
          error={
            errors.contactPhone?.message
          }
        >
          <input
            disabled={disabled}
            className="stroy-input"
            placeholder="+7 999 000-00-00"
            {...register(
              "contactPhone"
            )}
          />
        </Field>

        <Field
          icon={
            <Mail className="h-4 w-4" />
          }
          label="Email"
        >
          <input
            type="email"
            disabled={disabled}
            className="stroy-input"
            {...register(
              "contactEmail"
            )}
          />
        </Field>

        <Field
          icon={
            <Globe2 className="h-4 w-4" />
          }
          label="Сайт"
          error={
            errors.website?.message
          }
        >
          <input
            disabled={disabled}
            className="stroy-input"
            placeholder="https://example.ru"
            {...register(
              "website"
            )}
          />
        </Field>

        <Field
          icon={
            <MessageCircle className="h-4 w-4" />
          }
          label="Telegram"
        >
          <input
            disabled={disabled}
            className="stroy-input"
            placeholder="@company"
            {...register(
              "telegram"
            )}
          />
        </Field>
      </div>
    </section>
  );
}

function Field({
  icon,
  label,
  error,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  error?: string;
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

      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}