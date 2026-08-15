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

type Props = {
  projectId: string;
  existingBid: ExistingBid | null;
};

export function BidForm({ projectId, existingBid }: Props) {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const locked = Boolean(
    existingBid && !["submitted", "viewed", "shortlisted"].includes(existingBid.status)
  );

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
      paymentTerms: existingBid?.payment_terms ?? "",
      warrantyMonths: existingBid?.warranty_months ?? 12,
      priceIncludesMaterials: existingBid?.price_includes_materials ?? false,
    },
  });

  function onSubmit(values: BidInput) {
    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result = await saveBid(values);
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      setMessage(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("projectId")} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            {existingBid ? "Ваше предложение" : "Новое предложение"}
          </p>
          <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            Детализированная смета
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Заказчик увидит предложение в едином формате и сможет сравнить его с другими подрядчиками.
          </p>
        </div>
        {existingBid?.completeness_score !== undefined && (
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
            Полнота {existingBid.completeness_score}%
          </span>
        )}
      </div>

      {locked && (
        <Notice icon={<LockKeyhole className="h-4 w-4" />} title="Редактирование недоступно">
          Текущий статус предложения больше не позволяет менять условия.
        </Notice>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Стоимость работ" icon={<Banknote className="h-4 w-4" />} error={errors.price?.message}>
          <div className="relative">
            <input type="number" min="0" disabled={locked} className="stroy-input pr-14" {...register("price", { valueAsNumber: true })} />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted-foreground">₽</span>
          </div>
        </Field>

        <Field label="Срок выполнения" icon={<Clock3 className="h-4 w-4" />} error={errors.durationDays?.message}>
          <div className="relative">
            <input type="number" min="1" disabled={locked} className="stroy-input pr-20" {...register("durationDays", { valueAsNumber: true })} />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">дней</span>
          </div>
        </Field>
      </div>

      <Field label="Возможная дата начала" icon={<CalendarDays className="h-4 w-4" />} error={errors.proposedStartDate?.message}>
        <input type="date" disabled={locked} className="stroy-input" {...register("proposedStartDate")} />
      </Field>

      <Field
        label="Состав работ"
        description="Что именно входит в ваше предложение: основные этапы, объём и результат."
        icon={<Hammer className="h-4 w-4" />}
        error={errors.scopeSummary?.message}
      >
        <textarea rows={6} disabled={locked} className="stroy-textarea" placeholder="Например: демонтаж, подготовка основания, устройство фундамента, стены, кровля..." {...register("scopeSummary")} />
      </Field>

      <Field
        label="Материалы"
        description="Укажите, какие материалы включены, кто их закупает и какие марки/классы планируются."
        icon={<PackageCheck className="h-4 w-4" />}
        error={errors.materialsSummary?.message}
      >
        <textarea rows={5} disabled={locked} className="stroy-textarea" {...register("materialsSummary")} />
      </Field>

      <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-background/60 p-4">
        <input type="checkbox" disabled={locked} className="mt-1 h-4 w-4 accent-[var(--primary)]" {...register("priceIncludesMaterials")} />
        <span>
          <span className="block text-sm font-semibold text-foreground">Материалы включены в указанную стоимость</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">Если не отмечено, заказчик увидит, что материалы оплачиваются отдельно.</span>
        </span>
      </label>

      <Field
        label="Что не входит в предложение"
        description="Необязательное поле. Явно укажите исключения, чтобы снизить риск разногласий."
        icon={<FileCheck2 className="h-4 w-4" />}
        error={errors.exclusions?.message}
      >
        <textarea rows={4} disabled={locked} className="stroy-textarea" {...register("exclusions")} />
      </Field>

      <Field
        label="Условия оплаты"
        description="Например: 10% аванс, далее оплата по этапам после приёмки."
        icon={<ReceiptText className="h-4 w-4" />}
        error={errors.paymentTerms?.message}
      >
        <textarea rows={4} disabled={locked} className="stroy-textarea" {...register("paymentTerms")} />
      </Field>

      <Field label="Гарантия на работы" icon={<ShieldCheck className="h-4 w-4" />} error={errors.warrantyMonths?.message}>
        <div className="relative">
          <input type="number" min="0" max="120" disabled={locked} className="stroy-input pr-24" {...register("warrantyMonths", { valueAsNumber: true })} />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">месяцев</span>
        </div>
      </Field>

      <Field label="Комментарий заказчику" icon={<MessageSquareText className="h-4 w-4" />} error={errors.message?.message}>
        <textarea rows={5} disabled={locked} className="stroy-textarea" {...register("message")} />
      </Field>

      {message && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5" /><p className="text-sm">{message}</p></div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-900">
          <div className="flex gap-3"><TriangleAlert className="mt-0.5 h-5 w-5" /><p className="text-sm">{errorMessage}</p></div>
        </div>
      )}

      {!locked && (
        <div className="border-t border-border pt-5">
          <button type="submit" disabled={isPending} className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)] disabled:opacity-60">
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </span>
              {isPending ? "Сохраняем..." : existingBid ? "Обновить предложение" : "Отправить предложение"}
            </span>
            {!isPending && <span>→</span>}
          </button>
          {existingBid && isDirty && <p className="mt-3 text-center text-xs text-muted-foreground">Есть несохранённые изменения.</p>}
        </div>
      )}
    </form>
  );
}

function Field({ label, description, icon, error, children }: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <div className="flex items-center gap-2"><span className="text-primary">{icon}</span><p className="text-sm font-semibold text-foreground">{label}</p></div>
        {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children}
      {error && <p className="mt-2 text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-secondary/50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p></div>
      </div>
    </div>
  );
}
