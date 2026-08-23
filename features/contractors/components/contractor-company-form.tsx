"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Save, Send, TriangleAlert } from "lucide-react";

import {
  contractorCompanyDraftSchema,
  contractorCompanySchema,
  type ContractorCompanyFormInput,
  type ContractorCompanyInput,
} from "@/features/contractors/schemas/contractor-company-schema";
import { saveContractorCompany } from "@/features/contractors/actions/save-contractor-company";
import { submitContractorVerification } from "@/features/contractors/actions/submit-contractor-verification";
import { setContractorAvailability } from "@/features/contractors/actions/set-contractor-availability";
import { CompanyStatusBlock } from "@/features/contractors/components/company-form/company-status-block";
import { CompanyMainSection } from "@/features/contractors/components/company-form/company-main-section";
import { CompanyExperienceSection } from "@/features/contractors/components/company-form/company-experience-section";
import { CompanyServicesSection } from "@/features/contractors/components/company-form/company-services-section";
import { CompanyCitiesSection } from "@/features/contractors/components/company-form/company-cities-section";
import { CompanyContactsSection } from "@/features/contractors/components/company-form/company-contacts-section";
import type { ContractorCityOption } from "@/features/contractors/queries/get-contractor-cities";
import type { ContractorCategory, ExistingContractorCompany } from "@/features/contractors/types/contractor-company-form";

type Props = { categories: ContractorCategory[]; cities: ContractorCityOption[]; company: ExistingContractorCompany | null };

export function ContractorCompanyForm({ categories, cities, company }: Props) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();
  const [isChangingAvailability, startAvailabilityChange] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCategoryIds = company?.contractor_services?.map((service) => Number(service.category_id)) ?? [];
  const selectedCities = company?.contractor_service_areas?.map((area) => area.city) ?? [];

  const {
    register, handleSubmit, watch, setValue, reset, getValues, setError, clearErrors,
    formState: { errors, isDirty },
  } = useForm<ContractorCompanyFormInput, unknown, ContractorCompanyInput>({
    resolver: zodResolver(contractorCompanyDraftSchema),
    defaultValues: {
      publicName: company?.public_name ?? "",
      legalName: company?.legal_name ?? "",
      companyType: (company?.company_type as ContractorCompanyInput["companyType"]) ?? "entrepreneur",
      inn: company?.inn ?? "",
      ogrn: company?.ogrn ?? "",
      description: company?.description ?? "",
      foundedYear: company?.founded_year ?? undefined,
      employeeCount: company?.employee_count ?? undefined,
      minimumProjectBudget: company?.minimum_project_budget ?? undefined,
      maximumProjectBudget: company?.maximum_project_budget ?? undefined,
      contactPhone: company?.contact_phone ?? "",
      contactEmail: company?.contact_email ?? "",
      website: company?.website ?? "",
      telegram: company?.telegram ?? "",
      acceptsNewProjects: company?.accepts_new_projects ?? true,
      categoryIds: selectedCategoryIds,
      cities: selectedCities,
    },
  });

  const watchedCategories = watch("categoryIds") ?? [];
  const watchedCities = watch("cities") ?? [];
  const acceptsNewProjects = watch("acceptsNewProjects") ?? true;
  const status = company?.verification_status ?? "draft";
  const formLocked = status === "pending";
  const editingVerifiedProfile = status === "verified";

  function toggleCategory(categoryId: number) {
    if (formLocked) return;
    const updated = watchedCategories.includes(categoryId) ? watchedCategories.filter((id) => id !== categoryId) : [...watchedCategories, categoryId];
    setValue("categoryIds", updated, { shouldValidate: true, shouldDirty: true });
    if (updated.length > 0) clearErrors("categoryIds");
  }

  function toggleCity(city: string) {
    if (formLocked) return;
    const updated = watchedCities.includes(city) ? watchedCities.filter((item) => item !== city) : [...watchedCities, city];
    setValue("cities", updated, { shouldValidate: true, shouldDirty: true });
    if (updated.length > 0) clearErrors("cities");
  }

  function handleAvailabilityChange(value: boolean) {
    if (value === acceptsNewProjects || isChangingAvailability) return;
    const previous = acceptsNewProjects;
    setMessage(null); setErrorMessage(null);
    setValue("acceptsNewProjects", value, { shouldValidate: true, shouldDirty: !company });
    if (!company) { setMessage("Статус доступности будет сохранён вместе с анкетой профиля."); return; }
    startAvailabilityChange(async () => {
      const result = await setContractorAvailability(value);
      if (!result.success) { setValue("acceptsNewProjects", previous, { shouldDirty: false }); setErrorMessage(result.message); return; }
      setMessage(result.message); router.refresh();
    });
  }

  function onSave(values: ContractorCompanyInput) {
    setMessage(null); setErrorMessage(null);
    startSaving(async () => {
      try {
        const result = await saveContractorCompany(values);
        if (!result.success) { setErrorMessage(result.message); return; }
        setMessage(result.message); reset(values); router.refresh();
      } catch (error) {
        console.error("Ошибка сохранения анкеты компании:", error);
        setErrorMessage("Не удалось сохранить анкету. Попробуйте ещё раз.");
      }
    });
  }

  function onInvalid() {
    const firstError = Object.values(errors)[0];
    const validationMessage = firstError && typeof firstError === "object" && "message" in firstError && typeof firstError.message === "string" ? firstError.message : "Проверьте заполненные поля";
    setMessage(null); setErrorMessage(validationMessage);
  }

  function handleSubmitForVerification() {
    setMessage(null); setErrorMessage(null); clearErrors();
    const values = getValues();
    const parsed = contractorCompanySchema.safeParse(values);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field !== "string") continue;
        setError(field as keyof ContractorCompanyFormInput, { type: "manual", message: issue.message });
      }
      setErrorMessage("Заполните обязательные поля, отмеченные красным, и повторите отправку.");
      if (firstIssue) {
        const firstField = String(firstIssue.path[0] ?? "");
        window.requestAnimationFrame(() => {
          const target = document.querySelector<HTMLElement>(`[data-company-field="${firstField}"]`);
          target?.scrollIntoView({ behavior: "smooth", block: "center" });
          target?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
        });
      }
      return;
    }
    startSubmitting(async () => {
      try {
        const result = await submitContractorVerification();
        if (!result.success) { setErrorMessage(result.message); return; }
        setMessage(result.message); router.refresh();
      } catch (error) {
        console.error("Ошибка отправки профиля на проверку:", error);
        setErrorMessage("Не удалось отправить профиль на проверку");
      }
    });
  }

  return (
    <div className="space-y-6">
      <CompanyStatusBlock status={status} comment={company?.verification_comment ?? null} />
      {editingVerifiedProfile && (
        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Профиль подтверждён. Услуги, города работы, описание, контакты и диапазон бюджета можно обновлять без снятия подтверждения. При изменении юридического наименования, типа компании, ИНН или ОГРН/ОГРНИП профиль автоматически перейдёт на повторную проверку.
        </div>
      )}
      <form onSubmit={handleSubmit(onSave, onInvalid)} className="space-y-6">
        <CompanyMainSection register={register} errors={errors} disabled={formLocked} />
        <CompanyExperienceSection register={register} errors={errors} disabled={formLocked} acceptsNewProjects={acceptsNewProjects} availabilityPending={isChangingAvailability} onAvailabilityChange={handleAvailabilityChange} />
        <CompanyServicesSection categories={categories} selectedIds={watchedCategories} disabled={formLocked} error={errors.categoryIds?.message} onToggle={toggleCategory} />
        <CompanyCitiesSection cities={cities} selectedCities={watchedCities} disabled={formLocked} error={errors.cities?.message} onToggle={toggleCity} />
        <CompanyContactsSection register={register} errors={errors} disabled={formLocked} />

        {message && <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-semibold">Готово</p><p className="mt-1 text-sm leading-6 opacity-85">{message}</p></div></div></div>}
        {errorMessage && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-900"><div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-semibold">Проверьте профиль</p><p className="mt-1 text-sm leading-6 opacity-85">{errorMessage}</p></div></div></div>}

        <div className="sticky bottom-4 z-20 rounded-[1.5rem] border border-border bg-card/95 p-4 shadow-[var(--shadow-card)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-foreground">Анкета компании</p><p className="mt-1 text-xs text-muted-foreground">{formLocked ? "Анкета временно заблокирована на период проверки. Доступность для новых проектов можно менять отдельно." : isDirty ? "Есть несохранённые изменения." : "Все изменения сохранены."}</p></div>
            <div className="flex flex-wrap gap-3">
              {!formLocked && <button type="submit" disabled={isSaving || isSubmitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(107,70,50,0.16)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50">{isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Сохраняем...</> : <><Save className="h-4 w-4" />{editingVerifiedProfile ? "Сохранить изменения" : "Сохранить анкету"}</>}</button>}
              {company && (status === "draft" || status === "rejected") && <button type="button" disabled={isSaving || isSubmitting} onClick={handleSubmitForVerification} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-secondary px-5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50">{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Отправляем...</> : <><Send className="h-4 w-4" />Отправить на проверку</>}</button>}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
