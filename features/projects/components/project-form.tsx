"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Save,
} from "lucide-react";

import {
  projectSchema,
  type ProjectInput,
} from "@/features/projects/schemas/project-schema";

import { saveProject } from
  "@/features/projects/actions/save-project";

import { FormSection } from
  "@/components/stroy/forms/form-section";

import { FormField } from
  "@/components/stroy/forms/form-field";

type ProjectFormInput = z.input<
  typeof projectSchema
>;

type Category = {
  id: number;
  name: string;
};

type ExistingProject = {
  id: string;

  category_id: number;

  title: string;

  description: string;

  property_type:
    ProjectInput["propertyType"];

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

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isDirty,
    },
  } = useForm<
    ProjectFormInput,
    unknown,
    ProjectInput
  >({
    resolver: zodResolver(
      projectSchema
    ),

    defaultValues: {
      categoryId:
        project?.category_id ??
        categories[0]?.id,

      title:
        project?.title ?? "",

      description:
        project?.description ?? "",

      propertyType:
        project?.property_type ??
        "private_house",

      region:
        project?.region ??
        "Республика Дагестан",

      city:
        project?.city ?? "",

      address:
        project?.address ?? "",

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

  function onSubmit(
    values: ProjectInput
  ) {
    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result =
        await saveProject(
          values,
          project?.id
        );

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setMessage(
        result.message
      );

      if (result.projectId) {
        router.replace(
          `/customer/projects/${result.projectId}`
        );

        router.refresh();

        return;
      }

      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(
        onSubmit
      )}
      className="space-y-5"
    >
      {/* Основная информация */}

      <FormSection
        title="Основная информация"
        description="Расскажите, какие работы необходимо выполнить. Эта информация поможет подрядчикам быстро понять вашу задачу."
        icon={
          <FileText className="h-5 w-5" />
        }
      >
        <div className="space-y-6">
          <FormField
            label="Категория работ"
            description="Выберите основное направление работ."
            required
            error={getErrorMessage(
              errors.categoryId
                ?.message
            )}
          >
            <div className="relative">
              <select
                className="stroy-select appearance-none pr-12"
                {...register(
                  "categoryId",
                  {
                    valueAsNumber:
                      true,
                  }
                )}
              >
                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
                ▼
              </div>
            </div>
          </FormField>

          <FormField
            label="Название проекта"
            description="Напишите короткое и понятное название."
            required
            error={getErrorMessage(
              errors.title?.message
            )}
          >
            <input
              className="stroy-input"
              placeholder="Например, строительство дома в Каспийске"
              {...register("title")}
            />
          </FormField>

          <FormField
            label="Описание проекта"
            description="Укажите объём работ, особенности объекта, материалы и ожидаемый результат."
            required
            error={getErrorMessage(
              errors.description
                ?.message
            )}
          >
            <textarea
              rows={8}
              className="stroy-textarea"
              placeholder="Например: необходимо построить двухэтажный частный дом площадью 180 м². Требуется устройство фундамента, возведение стен, кровля..."
              {...register(
                "description"
              )}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Тип объекта */}

      <FormSection
        title="Тип объекта"
        description="Укажите, с каким объектом связаны предстоящие работы."
        icon={
          <Building2 className="h-5 w-5" />
        }
      >
        <FormField
          label="Объект"
          required
          error={getErrorMessage(
            errors.propertyType
              ?.message
          )}
        >
          <div className="relative">
            <select
              className="stroy-select appearance-none pr-12"
              {...register(
                "propertyType"
              )}
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

            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
              ▼
            </div>
          </div>
        </FormField>
      </FormSection>

      {/* Местонахождение */}

      <FormSection
        title="Местонахождение объекта"
        description="Укажите место выполнения работ. Точный адрес можно добавить, если он уже известен."
        icon={
          <MapPin className="h-5 w-5" />
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            label="Регион"
            required
            error={getErrorMessage(
              errors.region?.message
            )}
          >
            <input
              className="stroy-input"
              placeholder="Республика Дагестан"
              {...register("region")}
            />
          </FormField>

          <FormField
            label="Город"
            required
            error={getErrorMessage(
              errors.city?.message
            )}
          >
            <div className="relative">
              <select
                className="stroy-select appearance-none pr-12"
                {...register("city")}
              >
                <option value="">
                  Выберите город
                </option>

                {CITIES.map(
                  (city) => (
                    <option
                      key={city}
                      value={city}
                    >
                      {city}
                    </option>
                  )
                )}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
                ▼
              </div>
            </div>
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Адрес или ориентир"
              description="Необязательное поле. Можно указать улицу, дом, микрорайон или ориентир."
              error={getErrorMessage(
                errors.address?.message
              )}
            >
              <input
                className="stroy-input"
                placeholder="Например, ул. Приморская, 18"
                {...register(
                  "address"
                )}
              />
            </FormField>
          </div>
        </div>
      </FormSection>

      {/* Бюджет */}

      <FormSection
        title="Бюджет проекта"
        description="Укажите ориентировочный диапазон стоимости. Это поможет получить более подходящие предложения."
        icon={
          <Banknote className="h-5 w-5" />
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            label="Бюджет от, ₽"
            description="Минимальная ориентировочная стоимость."
            error={getErrorMessage(
              errors.budgetMin
                ?.message
            )}
          >
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                className="stroy-input pr-14"
                placeholder="1 000 000"
                {...register(
                  "budgetMin",
                  {
                    valueAsNumber:
                      true,
                  }
                )}
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted-foreground">
                ₽
              </span>
            </div>
          </FormField>

          <FormField
            label="Бюджет до, ₽"
            description="Максимальная ориентировочная стоимость."
            error={getErrorMessage(
              errors.budgetMax
                ?.message
            )}
          >
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                className="stroy-input pr-14"
                placeholder="3 000 000"
                {...register(
                  "budgetMax",
                  {
                    valueAsNumber:
                      true,
                  }
                )}
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted-foreground">
                ₽
              </span>
            </div>
          </FormField>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Бюджет можно указать
            ориентировочно. Подрядчики
            смогут предложить свою
            стоимость после изучения
            проекта.
          </p>
        </div>
      </FormSection>

      {/* Сроки */}

      <FormSection
        title="Желаемые сроки"
        description="Укажите ориентировочные даты начала и окончания работ."
        icon={
          <CalendarDays className="h-5 w-5" />
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            label="Желаемое начало"
            error={getErrorMessage(
              errors
                .desiredStartDate
                ?.message
            )}
          >
            <input
              type="date"
              className="stroy-input"
              {...register(
                "desiredStartDate"
              )}
            />
          </FormField>

          <FormField
            label="Желаемое окончание"
            error={getErrorMessage(
              errors
                .desiredEndDate
                ?.message
            )}
          >
            <input
              type="date"
              className="stroy-input"
              {...register(
                "desiredEndDate"
              )}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Сообщение об успехе */}

      {message && (
        <div className="flex items-start gap-3 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Готово
            </p>

            <p className="mt-1 text-sm">
              {message}
            </p>
          </div>
        </div>
      )}

      {/* Сообщение об ошибке */}

      {errorMessage && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">
            Не удалось сохранить
            проект
          </p>

          <p className="mt-1 text-sm">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Нижний блок */}

      <div className="sticky bottom-4 z-20">
        <div className="rounded-[1.5rem] border border-border bg-card/95 p-4 shadow-[var(--shadow-floating)] backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {project
                  ? "Редактирование проекта"
                  : "Черновик проекта"}
              </p>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {project
                  ? isDirty
                    ? "Есть несохранённые изменения."
                    : "Изменения отсутствуют."
                  : "После создания проект можно проверить и опубликовать."}
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.22)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />

                  Сохраняем...
                </>
              ) : (
                <>
                  {project ? (
                    <Save className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}

                  {project
                    ? "Сохранить изменения"
                    : "Создать черновик"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function getErrorMessage(
  value: unknown
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}