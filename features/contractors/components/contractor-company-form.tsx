"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { DAGESTAN_CITIES } from
  "@/features/contractors/constants/cities";

import {
  contractorCompanySchema,
  type ContractorCompanyFormInput,
  type ContractorCompanyInput,
} from "@/features/contractors/schemas/contractor-company-schema";

import { saveContractorCompany } from
  "@/features/contractors/actions/save-contractor-company";

import { submitContractorVerification } from
  "@/features/contractors/actions/submit-contractor-verification";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type ExistingCompany = {
  id: string;
  public_name: string;
  legal_name: string | null;
  company_type: string | null;
  inn: string | null;
  ogrn: string | null;
  description: string | null;
  founded_year: number | null;
  employee_count: number | null;
  minimum_project_budget: number | null;
  maximum_project_budget: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  telegram: string | null;
  accepts_new_projects: boolean;
  verification_status: string;
  verification_comment: string | null;

  contractor_services?: Array<{
    category_id: number;
  }>;

  contractor_service_areas?: Array<{
    city: string;
  }>;
};

type Props = {
  categories: Category[];
  company: ExistingCompany | null;
};

export function ContractorCompanyForm({
  categories,
  company,
}: Props) {
  const router = useRouter();

  const [isSaving, startSaving] =
    useTransition();

  const [isSubmitting, startSubmitting] =
    useTransition();

  const [message, setMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const selectedCategoryIds =
    company?.contractor_services?.map(
      (service) => service.category_id
    ) ?? [];

  const selectedCities =
    company?.contractor_service_areas?.map(
      (area) => area.city
    ) ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<
  ContractorCompanyFormInput,
  unknown,
  ContractorCompanyInput
>({
  resolver: zodResolver(contractorCompanySchema),

    defaultValues: {
      publicName:
        company?.public_name ?? "",

      legalName:
        company?.legal_name ?? "",

      companyType:
        (company?.company_type as
          ContractorCompanyInput["companyType"]) ??
        "entrepreneur",

      inn:
        company?.inn ?? "",

      ogrn:
        company?.ogrn ?? "",

      description:
        company?.description ?? "",

      foundedYear:
        company?.founded_year ?? undefined,

      employeeCount:
        company?.employee_count ?? undefined,

      minimumProjectBudget:
        company?.minimum_project_budget ??
        undefined,

      maximumProjectBudget:
        company?.maximum_project_budget ??
        undefined,

      contactPhone:
        company?.contact_phone ?? "",

      contactEmail:
        company?.contact_email ?? "",

      website:
        company?.website ?? "",

      telegram:
        company?.telegram ?? "",

      acceptsNewProjects:
        company?.accepts_new_projects ?? true,

      categoryIds: selectedCategoryIds,
      cities: selectedCities,
    },
  });

  const watchedCategories =
    watch("categoryIds") ?? [];

  const watchedCities =
    watch("cities") ?? [];

  const status =
    company?.verification_status ?? "draft";

  const formLocked =
    status === "pending" ||
    status === "verified";

  function toggleCategory(categoryId: number) {
    if (formLocked) return;

    const updated =
      watchedCategories.includes(categoryId)
        ? watchedCategories.filter(
            (id) => id !== categoryId
          )
        : [...watchedCategories, categoryId];

    setValue("categoryIds", updated, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function toggleCity(city: string) {
    if (formLocked) return;

    const updated = watchedCities.includes(city)
      ? watchedCities.filter(
          (item) => item !== city
        )
      : [...watchedCities, city];

    setValue("cities", updated, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function onSave(
    values: ContractorCompanyInput
  ) {
    setMessage(null);
    setErrorMessage(null);

    startSaving(async () => {
      const result =
        await saveContractorCompany(values);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  }

  function handleSubmitForVerification() {
    setMessage(null);
    setErrorMessage(null);

    startSubmitting(async () => {
      const result =
        await submitContractorVerification();

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <StatusBlock
        status={status}
        comment={
          company?.verification_comment ?? null
        }
      />

      <form
        onSubmit={handleSubmit(onSave)}
        className="space-y-8"
      >
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold">
            Основная информация
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="publicName">
                Публичное название
              </Label>

              <Input
                id="publicName"
                disabled={formLocked}
                placeholder="Например, СтройДом"
                {...register("publicName")}
              />

              {errors.publicName && (
                <p className="text-sm text-red-600">
                  {errors.publicName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyType">
                Тип подрядчика
              </Label>

              <select
                id="companyType"
                disabled={formLocked}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                {...register("companyType")}
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
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="legalName">
                Юридическое название
              </Label>

              <Input
                id="legalName"
                disabled={formLocked}
                placeholder="ИП Иванов Иван Иванович"
                {...register("legalName")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inn">ИНН</Label>

              <Input
                id="inn"
                disabled={formLocked}
                inputMode="numeric"
                {...register("inn")}
              />

              {errors.inn && (
                <p className="text-sm text-red-600">
                  {errors.inn.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogrn">
                ОГРН или ОГРНИП
              </Label>

              <Input
                id="ogrn"
                disabled={formLocked}
                inputMode="numeric"
                {...register("ogrn")}
              />

              {errors.ogrn && (
                <p className="text-sm text-red-600">
                  {errors.ogrn.message}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">
                О компании
              </Label>

              <Textarea
                id="description"
                disabled={formLocked}
                rows={7}
                placeholder="Расскажите об опыте, команде, типах объектов и преимуществах..."
                {...register("description")}
              />

              {errors.description && (
                <p className="text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold">
            Опыт и возможности
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="foundedYear">
                Год начала работы
              </Label>

              <Input
                id="foundedYear"
                type="number"
                disabled={formLocked}
                {...register(
                  "foundedYear",
                  {
                    valueAsNumber: true,
                  }
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeCount">
                Количество сотрудников
              </Label>

              <Input
                id="employeeCount"
                type="number"
                disabled={formLocked}
                {...register(
                  "employeeCount",
                  {
                    valueAsNumber: true,
                  }
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumProjectBudget">
                Минимальный бюджет проекта
              </Label>

              <Input
                id="minimumProjectBudget"
                type="number"
                disabled={formLocked}
                {...register(
                  "minimumProjectBudget",
                  {
                    valueAsNumber: true,
                  }
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximumProjectBudget">
                Максимальный бюджет проекта
              </Label>

              <Input
                id="maximumProjectBudget"
                type="number"
                disabled={formLocked}
                {...register(
                  "maximumProjectBudget",
                  {
                    valueAsNumber: true,
                  }
                )}
              />
            </div>
          </div>

          <label className="mt-6 flex items-center gap-3">
            <input
              type="checkbox"
              disabled={formLocked}
              {...register("acceptsNewProjects")}
            />

            <span className="text-sm">
              Сейчас принимаем новые проекты
            </span>
          </label>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold">
            Специализации
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Выберите виды работ, которые выполняет
            ваша компания.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {categories.map((category) => {
              const selected =
                watchedCategories.includes(
                  category.id
                );

              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={formLocked}
                  onClick={() =>
                    toggleCategory(category.id)
                  }
                  className={`rounded-xl border p-4 text-left ${
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="font-medium">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>

          {errors.categoryIds && (
            <p className="mt-3 text-sm text-red-600">
              {errors.categoryIds.message}
            </p>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold">
            Города работы
          </h2>

          <div className="mt-5 flex flex-wrap gap-3">
            {DAGESTAN_CITIES.map((city) => {
              const selected =
                watchedCities.includes(city);

              return (
                <button
                  key={city}
                  type="button"
                  disabled={formLocked}
                  onClick={() =>
                    toggleCity(city)
                  }
                  className={`rounded-full border px-4 py-2 text-sm ${
                    selected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-800"
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>

          {errors.cities && (
            <p className="mt-3 text-sm text-red-600">
              {errors.cities.message}
            </p>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold">
            Контактные данные
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">
                Телефон
              </Label>

              <Input
                id="contactPhone"
                disabled={formLocked}
                placeholder="+7 999 000-00-00"
                {...register("contactPhone")}
              />

              {errors.contactPhone && (
                <p className="text-sm text-red-600">
                  {errors.contactPhone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">
                Email
              </Label>

              <Input
                id="contactEmail"
                type="email"
                disabled={formLocked}
                {...register("contactEmail")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">
                Сайт
              </Label>

              <Input
                id="website"
                disabled={formLocked}
                placeholder="https://example.ru"
                {...register("website")}
              />

              {errors.website && (
                <p className="text-sm text-red-600">
                  {errors.website.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram">
                Telegram
              </Label>

              <Input
                id="telegram"
                disabled={formLocked}
                placeholder="@company"
                {...register("telegram")}
              />
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {!formLocked && (
            <Button
              type="submit"
              disabled={
                isSaving ||
                isSubmitting
              }
            >
              {isSaving
                ? "Сохраняем..."
                : "Сохранить черновик"}
            </Button>
          )}

          {company &&
            status === "draft" && (
              <Button
                type="button"
                variant="outline"
                disabled={
                  isSaving ||
                  isSubmitting
                }
                onClick={
                  handleSubmitForVerification
                }
              >
                {isSubmitting
                  ? "Отправляем..."
                  : "Отправить на проверку"}
              </Button>
            )}
        </div>
      </form>
    </div>
  );
}

function StatusBlock({
  status,
  comment,
}: {
  status: string;
  comment: string | null;
}) {
  if (status === "pending") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-950">
          Профиль ожидает проверки
        </h2>

        <p className="mt-2 text-sm text-amber-800">
          Редактирование временно заблокировано.
        </p>
      </div>
    );
  }

  if (status === "verified") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <h2 className="font-semibold text-green-950">
          Подрядчик подтвержден
        </h2>
      </div>
    );
  }

  if (status === "rejected") {
  return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
      <h2 className="text-lg font-semibold text-red-950">
        Профиль требует исправлений
      </h2>

      <p className="mt-2 text-sm text-red-800">
        Администратор отклонил профиль. Исправьте замечания
        и повторно отправьте данные на проверку.
      </p>

      <div className="mt-4 rounded-xl border border-red-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
          Комментарий администратора
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-900">
          {comment || "Комментарий не указан"}
        </p>
      </div>
    </div>
  );
}

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h2 className="font-semibold text-blue-950">
        Черновик профиля
      </h2>

      <p className="mt-2 text-sm text-blue-800">
        Заполните данные, сохраните профиль,
        затем отправьте его на проверку.
      </p>
    </div>
  );
}