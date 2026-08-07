"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import { useForm } from "react-hook-form";

import { zodResolver } from
  "@hookform/resolvers/zod";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Save,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  portfolioProjectSchema,
  type PortfolioProjectFormInput,
  type PortfolioProjectInput,
} from
  "@/features/contractors/portfolio/schemas/portfolio-project-schema";

import { savePortfolioProject } from
  "@/features/contractors/portfolio/actions/save-portfolio-project";

type ExistingPortfolioProject = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  completed_year: number | null;
};

type Props = {
  project?: ExistingPortfolioProject | null;
  onClose?: () => void;
};

export function PortfolioProjectForm({
  project,
  onClose,
}: Props) {
  const router = useRouter();

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

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
    PortfolioProjectFormInput,
    unknown,
    PortfolioProjectInput
  >({
    resolver:
      zodResolver(
        portfolioProjectSchema
      ),

    defaultValues: {
      portfolioProjectId:
        project?.id,

      title:
        project?.title ?? "",

      description:
        project?.description ?? "",

      city:
        project?.city ?? "",

      completedYear:
        project?.completed_year ??
        undefined,
    },
  });

  function onSubmit(
    values: PortfolioProjectInput
  ) {
    setSuccessMessage("");
    setErrorMessage("");

    startTransition(async () => {
      const result =
        await savePortfolioProject(
          values
        );

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setSuccessMessage(
        result.message
      );

      router.refresh();

      if (onClose) {
        onClose();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(
        onSubmit,
        (formErrors) => {
          const firstError =
            Object.values(
              formErrors
            )[0];

          setErrorMessage(
            typeof firstError?.message ===
              "string"
              ? firstError.message
              : "Проверьте заполнение формы"
          );
        }
      )}
      className="space-y-6"
    >
      {project && (
        <input
          type="hidden"
          {...register(
            "portfolioProjectId"
          )}
        />
      )}

      <Field
        label="Название объекта"
        description="Короткое название выполненного проекта."
        icon={
          <Building2 className="h-4 w-4" />
        }
        error={
          errors.title?.message
        }
      >
        <input
          className="stroy-input"
          placeholder="Например, строительство частного дома"
          {...register("title")}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Город"
          icon={
            <MapPin className="h-4 w-4" />
          }
          error={
            errors.city?.message
          }
        >
          <input
            className="stroy-input"
            placeholder="Например, Каспийск"
            {...register("city")}
          />
        </Field>

        <Field
          label="Год завершения"
          icon={
            <CalendarDays className="h-4 w-4" />
          }
          error={
            errors.completedYear?.message
          }
        >
          <input
            type="number"
            min="1900"
            max={
              new Date().getFullYear()
            }
            className="stroy-input"
            placeholder="2026"
            {...register(
              "completedYear",
              {
                setValueAs:
                  (value) =>
                    value === ""
                      ? undefined
                      : Number(value),
              }
            )}
          />
        </Field>
      </div>

      <Field
        label="Описание выполненных работ"
        description="Расскажите, что именно было выполнено и в чём состояла задача."
        icon={
          <FileText className="h-4 w-4" />
        }
        error={
          errors.description?.message
        }
      >
        <textarea
          rows={6}
          className="stroy-textarea"
          placeholder="Например: строительство дома площадью 180 м² под ключ..."
          {...register(
            "description"
          )}
        />
      </Field>

      {successMessage && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Готово
              </p>

              <p className="mt-1 text-sm">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Не удалось сохранить
              </p>

              <p className="mt-1 text-sm">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {project
            ? isDirty
              ? "Есть несохранённые изменения."
              : "Изменения отсутствуют."
            : "После сохранения объекта можно будет добавить фотографии."}
        </p>

        <div className="flex flex-wrap gap-3">
          {onClose && (
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary/50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Отмена
            </button>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(107,70,50,0.16)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Сохраняем...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {project
                  ? "Сохранить изменения"
                  : "Добавить объект"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
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
    <div>
      <div className="mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-primary">
              {icon}
            </span>
          )}

          <p className="text-sm font-semibold text-foreground">
            {label}
          </p>
        </div>

        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}

      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}