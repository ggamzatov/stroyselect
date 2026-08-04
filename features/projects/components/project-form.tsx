"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  projectSchema,
  type ProjectInput,
} from "@/features/projects/schemas/project-schema";

import { saveProject } from
  "@/features/projects/actions/save-project";

type Category = {
  id: number;
  name: string;
};

type ExistingProject = {
  id: string;
  category_id: number;
  title: string;
  description: string;
  property_type: ProjectInput["propertyType"];
  region: string;
  city: string;
  address: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_start_date: string | null;
  desired_end_date: string | null;
};

type Props = {
  categories: Category[];
  project?: ExistingProject | null;
};

const CITIES = [
  "Махачкала",
  "Каспийск",
  "Дербент",
  "Хасавюрт",
  "Буйнакск",
  "Избербаш",
  "Кизляр",
  "Кизилюрт",
];

export function ProjectForm({
  categories,
  project,
}: Props) {
  const router = useRouter();

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),

    defaultValues: {
      categoryId:
        project?.category_id ??
        categories[0]?.id,

      title: project?.title ?? "",

      description:
        project?.description ?? "",

      propertyType:
        project?.property_type ??
        "private_house",

      region:
        project?.region ??
        "Республика Дагестан",

      city: project?.city ?? "",

      address: project?.address ?? "",

      budgetMin:
        project?.budget_min ??
        undefined,

      budgetMax:
        project?.budget_max ??
        undefined,

      desiredStartDate:
        project?.desired_start_date ??
        "",

      desiredEndDate:
        project?.desired_end_date ??
        "",
    },
  });

  function onSubmit(values: ProjectInput) {
    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result = await saveProject(
        values,
        project?.id
      );

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message);

      if (result.projectId) {
  router.replace(
    `/customer/projects/${result.projectId}`
  );
  router.refresh();
}

      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <FormSection title="Основная информация">
        <Field label="Категория работ">
          <select
            className="h-11 w-full rounded-lg border px-3"
            {...register("categoryId", {
              valueAsNumber: true,
            })}
          >
            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>

          <ErrorText
            message={
              errors.categoryId?.message
            }
          />
        </Field>

        <Field label="Название проекта">
          <input
            className="h-11 w-full rounded-lg border px-3"
            placeholder="Например, строительство дома в Каспийске"
            {...register("title")}
          />

          <ErrorText
            message={errors.title?.message}
          />
        </Field>

        <Field label="Описание">
          <textarea
            rows={8}
            className="w-full rounded-lg border p-3"
            placeholder="Опишите объект, объём работ, материалы и ожидаемый результат"
            {...register("description")}
          />

          <ErrorText
            message={
              errors.description?.message
            }
          />
        </Field>

        <Field label="Тип объекта">
          <select
            className="h-11 w-full rounded-lg border px-3"
            {...register("propertyType")}
          >
            <option value="private_house">
              Частный дом
            </option>

            <option value="apartment">
              Квартира
            </option>

            <option value="commercial">
              Коммерческий объект
            </option>

            <option value="land">
              Земельный участок
            </option>

            <option value="industrial">
              Производственный объект
            </option>

            <option value="other">
              Другое
            </option>
          </select>
        </Field>
      </FormSection>

      <FormSection title="Местонахождение объекта">
        <Field label="Регион">
          <input
            className="h-11 w-full rounded-lg border px-3"
            {...register("region")}
          />
        </Field>

        <Field label="Город">
          <select
            className="h-11 w-full rounded-lg border px-3"
            {...register("city")}
          >
            <option value="">
              Выберите город
            </option>

            {CITIES.map((city) => (
              <option
                key={city}
                value={city}
              >
                {city}
              </option>
            ))}
          </select>

          <ErrorText
            message={errors.city?.message}
          />
        </Field>

        <Field label="Адрес">
          <input
            className="h-11 w-full rounded-lg border px-3"
            placeholder="Улица, дом или ориентир"
            {...register("address")}
          />
        </Field>
      </FormSection>

      <FormSection title="Бюджет и сроки">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Бюджет от, ₽">
            <input
              type="number"
              className="h-11 w-full rounded-lg border px-3"
              {...register("budgetMin", {
                valueAsNumber: true,
              })}
            />

            <ErrorText
              message={
                errors.budgetMin?.message
              }
            />
          </Field>

          <Field label="Бюджет до, ₽">
            <input
              type="number"
              className="h-11 w-full rounded-lg border px-3"
              {...register("budgetMax", {
                valueAsNumber: true,
              })}
            />

            <ErrorText
              message={
                errors.budgetMax?.message
              }
            />
          </Field>

          <Field label="Желаемое начало">
            <input
              type="date"
              className="h-11 w-full rounded-lg border px-3"
              {...register(
                "desiredStartDate"
              )}
            />
          </Field>

          <Field label="Желаемое окончание">
            <input
              type="date"
              className="h-11 w-full rounded-lg border px-3"
              {...register(
                "desiredEndDate"
              )}
            />

            <ErrorText
              message={
                errors.desiredEndDate
                  ?.message
              }
            />
          </Field>
        </div>
      </FormSection>

      {message && (
        <div className="rounded-xl bg-green-50 p-4 text-green-800">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {isPending
          ? "Сохраняем..."
          : project
            ? "Сохранить изменения"
            : "Создать черновик"}
      </button>
    </form>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <div className="mt-5 space-y-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {label}
      </span>

      {children}
    </label>
  );
}

function ErrorText({
  message,
}: {
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-red-600">
      {message}
    </p>
  );
}