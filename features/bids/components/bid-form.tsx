"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Hammer,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { BidFormInput, bidSchema, type BidInput } from "@/features/bids/schemas/bid-schema";
import { saveBid } from "@/features/bids/actions/save-bid";

type ExistingBid = {
  id: string;
  price: number | string;
  duration_days: number;
  message: string;
  proposed_start_date: string | null;
  status: string;
  scope_summary?: string;
  materials_summary?: string;
  exclusions?: string;
  payment_terms?: string;
  warranty_months?: number;
  price_includes_materials?: boolean;
  completeness_score?: number;
};

type Props = { projectId: string; existingBid: ExistingBid | null };

const PAYMENT_OPTIONS = [
  "Без аванса, оплата по факту приёмки",
  "10% аванс, остаток после приёмки",
  "20% аванс, остаток после приёмки",
  "30% аванс, остаток после приёмки",
  "Оплата по этапам после приёмки каждого этапа",
  "10% аванс, далее оплата по этапам после приёмки",
  "20% аванс, далее оплата по этапам после приёмки",
  "30% аванс, далее оплата по этапам после приёмки",
] as const;

const WARRANTY_OPTIONS = [0, 3, 6, 12, 24, 36, 60] as const;

export function BidForm({ projectId, existingBid }: Props) {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const locked = Boolean(existingBid && !["submitted", "viewed", "shortlisted"].includes(existingBid.status));

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<BidFormInput, unknown, BidInput>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      projectId,
      price: existingBid ? Number(existingBid.price) : undefined,
      durationDays: existingBid?.duration_days,
      message: existingBid?.message ?? "",
      proposedStartDate: existingBid?.proposed_start_date ?? "",
      scopeSummary: existingBid?.scope_summary ?? "",
      materialsSummary: existingBid?.materials_summary ?? "",
      exclusions: existingBid?.exclusions ?? "",
      paymentTerms: existingBid?.payment_terms ?? PAYMENT_OPTIONS[5],
      warrantyMonths: existingBid?.warranty_months ?? 12,
      priceIncludesMaterials: existingBid?.price_includes_materials ?? false,
    },
  });

  function onSubmit(values: BidInput) {
    setMessage("");
    setErrorMessage("");
    startTransition(async () => {
      const result = await saveBid(values);
      if (!result.success) return setErrorMessage(result.message);
      setMessage(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("projectId")} />

      <div className="flex items-start justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            {existingBid ? "Ваше предложение" : "Новое предложение"}
          </p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.025em] text-foreground">Детализированная смета</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Заполните только реальные условия, которые готовы зафиксировать для заказчика.
          </p>
        </div>
        {existingBid?.completeness_score !== undefined ? (
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-black text-primary">
            {existingBid.completeness_score}%
          </span>
        ) : null}
      </div>

      {locked ? (
        <Notice icon={<LockKeyhole className="h-4 w-4" />} title="Редактирование недоступно">
          Текущий статус предложения больше не позволяет менять условия.
        </Notice>
      ) : null}

      <FormSection
        title="Основные условия"
        description="Цена, длительность и возможная дата старта."
        icon={<Banknote className="h-4 w-4" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Стоимость работ" icon={<Banknote className="h-4 w-4" />} error={errors.price?.message}>
            <div className="relative">
              <input
                type="number"
                min="0"
                disabled={locked}
                className="stroy-input pr-14"
                {...register("price", { valueAsNumber: true })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted-foreground">₽</span>
            </div>
          </Field>

          <Field label="Срок выполнения" icon={<Clock3 className="h-4 w-4" />} error={errors.durationDays?.message}>
            <div className="relative">
              <input
                type="number"
                min="1"
                disabled={locked}
                className="stroy-input pr-20"
                {...register("durationDays", { valueAsNumber: true })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">дней</span>
            </div>
          </Field>
        </div>

        <Field label="Возможная дата начала" icon={<CalendarDays className="h-4 w-4" />} error={errors.proposedStartDate?.message}>
          <input type="date" disabled={locked} className="stroy-input" {...register("proposedStartDate")} />
        </Field>
      </FormSection>

      <FormSection
        title="Состав предложения"
        description="Опишите фактический объём, материалы и исключения."
        icon={<Hammer className="h-4 w-4" />}
      >
        <Field
          label="Состав работ"
          description="Что именно входит: основные этапы, объём и результат."
          icon={<Hammer className="h-4 w-4" />}
          error={errors.scopeSummary?.message}
        >
          <textarea
            rows={5}
            disabled={locked}
            className="stroy-textarea"
            placeholder="Опишите состав, объём и результат работ"
            {...register("scopeSummary")}
          />
        </Field>

        <Field
          label="Материалы"
          description="Конкретные материалы, марки или оборудование, если это относится к проекту."
          icon={<PackageCheck className="h-4 w-4" />}
          error={errors.materialsSummary?.message}
        >
          <textarea rows={4} disabled={locked} className="stroy-textarea" {...register("materialsSummary")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Материалы в стоимости"
            description="Укажите, входят ли материалы в цену."
            icon={<PackageCheck className="h-4 w-4" />}
          >
            <select
              disabled={locked}
              className="stroy-input"
              {...register("priceIncludesMaterials", { setValueAs: (value) => value === "true" })}
            >
              <option value="false">Оплачиваются отдельно</option>
              <option value="true">Включены в стоимость</option>
            </select>
          </Field>

          <Field
            label="Гарантия на работы"
            icon={<ShieldCheck className="h-4 w-4" />}
            error={errors.warrantyMonths?.message}
          >
            <select disabled={locked} className="stroy-input" {...register("warrantyMonths", { valueAsNumber: true })}>
              {WARRANTY_OPTIONS.map((months) => (
                <option key={months} value={months}>
                  {months === 0 ? "Без дополнительной гарантии" : `${months} мес.`}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Что не входит в предложение"
          description="Перечислите индивидуальные исключения из цены и объёма."
          icon={<FileCheck2 className="h-4 w-4" />}
          error={errors.exclusions?.message}
        >
          <textarea rows={4} disabled={locked} className="stroy-textarea" {...register("exclusions")} />
        </Field>
      </FormSection>

      <FormSection
        title="Расчёты и комментарий"
        description="Условия оплаты и дополнительная информация для заказчика."
        icon={<ReceiptText className="h-4 w-4" />}
      >
        <Field
          label="Условия оплаты"
          description="Стандартная схема, которая затем может быть зафиксирована в договоре и графике платежей."
          icon={<ReceiptText className="h-4 w-4" />}
          error={errors.paymentTerms?.message}
        >
          <select disabled={locked} className="stroy-input" {...register("paymentTerms")}>
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Комментарий заказчику"
          description="Дополнительная индивидуальная информация; поле необязательное."
          icon={<MessageSquareText className="h-4 w-4" />}
          error={errors.message?.message}
        >
          <textarea rows={4} disabled={locked} className="stroy-textarea" {...register("message")} />
        </Field>
      </FormSection>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">{message}</p>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {!locked ? (
        <div className="border-t border-border pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="group flex min-h-13 w-full items-center justify-between gap-4 rounded-2xl bg-primary px-4 font-bold text-primary-foreground shadow-[0_10px_24px_rgba(8,122,80,0.18)] transition hover:-translate-y-0.5 hover:bg-[#076c47] disabled:translate-y-0 disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </span>
              {isPending ? "Сохраняем..." : existingBid ? "Обновить предложение" : "Отправить предложение"}
            </span>
            <span aria-hidden="true">→</span>
          </button>
          {existingBid && isDirty ? (
            <p className="mt-3 text-center text-xs font-medium text-muted-foreground">Есть несохранённые изменения.</p>
          ) : null}
        </div>
      ) : null}
    </form>
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
    <section className="rounded-2xl border border-border bg-background/65 p-4 sm:p-5">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span>
        <div>
          <h4 className="text-sm font-black text-foreground">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  description,
  icon,
  error,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block">
        <span className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="text-sm font-bold text-foreground">{label}</span>
        </span>
        {description ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
      {children}
      {error ? <span className="mt-2 block text-sm font-semibold text-destructive">{error}</span> : null}
    </label>
  );
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/45 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p>
        </div>
      </div>
    </div>
  );
}
