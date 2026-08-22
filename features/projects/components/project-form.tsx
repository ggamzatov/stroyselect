"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Save } from "lucide-react";

import { projectSchema, type ProjectInput } from "@/features/projects/schemas/project-schema";
import { saveProject } from "@/features/projects/actions/save-project";
import { FormField } from "@/components/stroy/forms/form-field";

type ProjectFormInput = z.input<typeof projectSchema>;
type Category = { id: number; name: string };

type ExistingProject = {
  id: string;
  category_id: number;
  title: string;
  description: string;
  property_type: ProjectInput["propertyType"];
  work_type?: string | null;
  scope_details?: string | null;
  current_condition?: string | null;
  finish_level?: string | null;
  dimensions?: string | null;
  material_preferences?: string | null;
  permit_readiness?: string | null;
  design_readiness?: string | null;
  travel_constraints?: string | null;
  region: string;
  city: string;
  address: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_start_date: string | null;
  desired_end_date: string | null;
};

type Props = { categories: Category[]; project?: ExistingProject | null };

type FieldName = keyof ProjectFormInput;

type Step = {
  title: string;
  description: string;
  fields: FieldName[];
};

const CITIES = [
  "Махачкала", "Каспийск", "Дербент", "Хасавюрт",
  "Буйнакск", "Избербаш", "Кизляр", "Кизилюрт",
];

const STEPS: Step[] = [
  {
    title: "Основа проекта",
    description: "Что строим, где находится объект и какой результат нужен.",
    fields: ["categoryId", "propertyType", "title", "description", "region", "city"],
  },
  {
    title: "Объём и состояние",
    description: "Структурируем работы, размеры, состояние объекта и материалы.",
    fields: ["workType", "scopeDetails", "currentCondition", "dimensions", "finishLevel", "materialPreferences"],
  },
  {
    title: "Готовность к работам",
    description: "Уточняем проектную документацию, разрешения и условия выезда.",
    fields: ["permitReadiness", "designReadiness", "travelConstraints", "address"],
  },
  {
    title: "Бюджет и сроки",
    description: "Фиксируем ориентиры, чтобы matching отсеивал неподходящие варианты.",
    fields: ["budgetMin", "budgetMax", "desiredStartDate", "desiredEndDate"],
  },
];

export function ProjectForm({ categories, project }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState(project?.id);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    trigger,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ProjectFormInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      categoryId: project?.category_id ?? categories[0]?.id,
      title: project?.title ?? "",
      description: project?.description ?? "",
      propertyType: project?.property_type ?? "private_house",
      workType: project?.work_type ?? "",
      scopeDetails: project?.scope_details ?? "",
      currentCondition: project?.current_condition ?? "",
      finishLevel: (project?.finish_level as ProjectFormInput["finishLevel"]) ?? "",
      dimensions: project?.dimensions ?? "",
      materialPreferences: project?.material_preferences ?? "",
      permitReadiness: (project?.permit_readiness as ProjectFormInput["permitReadiness"]) ?? "",
      designReadiness: (project?.design_readiness as ProjectFormInput["designReadiness"]) ?? "",
      travelConstraints: project?.travel_constraints ?? "",
      region: project?.region ?? "Республика Дагестан",
      city: project?.city ?? "",
      address: project?.address ?? "",
      budgetMin: project?.budget_min ?? undefined,
      budgetMax: project?.budget_max ?? undefined,
      desiredStartDate: project?.desired_start_date ?? "",
      desiredEndDate: project?.desired_end_date ?? "",
    },
  });

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);
  const current = STEPS[step];

  async function persistDraft(goToNext: boolean) {
    setMessage("");
    setErrorMessage("");

    const valid = await trigger(current.fields);
    if (!valid) return;

    const parsed = projectSchema.safeParse(getValues());
    if (!parsed.success) {
      const firstRequiredIssue = parsed.error.issues.find((issue) =>
        STEPS.slice(0, step + 1).some((item) => item.fields.includes(issue.path[0] as FieldName))
      );
      if (firstRequiredIssue) {
        setErrorMessage(firstRequiredIssue.message);
        return;
      }
    }

    const values = parsed.success ? parsed.data : (getValues() as ProjectInput);

    startTransition(async () => {
      const result = await saveProject(values, activeProjectId);
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      if (result.projectId && !activeProjectId) setActiveProjectId(result.projectId);
      setMessage("Черновик сохранён");

      if (goToNext && step < STEPS.length - 1) {
        setStep((value) => value + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (!goToNext && result.projectId) {
        router.replace(`/customer/projects/${result.projectId}`);
        router.refresh();
      }
    });
  }

  async function nextStep() {
    await persistDraft(true);
  }

  async function finish() {
    const valid = await trigger();
    if (!valid) {
      setErrorMessage("Проверьте обязательные поля перед сохранением проекта");
      return;
    }
    await persistDraft(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Шаг {step + 1} из {STEPS.length}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.025em]">{current.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.description}</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-2xl font-bold">{progress}%</p>
            <p className="text-xs text-muted-foreground">бриф заполнен</p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {STEPS.map((item, index) => (
            <button
              key={item.title}
              type="button"
              disabled={index > step || isPending}
              onClick={() => index <= step && setStep(index)}
              className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                index === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : index < step
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              {index + 1}. {item.title}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-7">
        {step === 0 && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Категория работ" required error={errorText(errors.categoryId?.message)}>
                <select className="stroy-select" {...register("categoryId", { valueAsNumber: true })}>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </FormField>

              <FormField label="Тип объекта" required error={errorText(errors.propertyType?.message)}>
                <select className="stroy-select" {...register("propertyType")}>
                  <option value="private_house">Частный дом</option>
                  <option value="apartment">Квартира</option>
                  <option value="commercial">Коммерческий объект</option>
                  <option value="land">Земельный участок</option>
                  <option value="industrial">Производственный объект</option>
                  <option value="other">Другое</option>
                </select>
              </FormField>
            </div>

            <FormField label="Название проекта" required error={errorText(errors.title?.message)}>
              <input className="stroy-input" placeholder="Например, капитальный ремонт квартиры" {...register("title")} />
            </FormField>

            <FormField label="Что нужно сделать" description="Опишите ожидаемый результат понятным языком." required error={errorText(errors.description?.message)}>
              <textarea rows={6} className="stroy-textarea" placeholder="Опишите объект, основные работы и желаемый результат..." {...register("description")} />
            </FormField>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Регион" required error={errorText(errors.region?.message)}>
                <input className="stroy-input" {...register("region")} />
              </FormField>
              <FormField label="Город" required error={errorText(errors.city?.message)}>
                <select className="stroy-select" {...register("city")}>
                  <option value="">Выберите город</option>
                  {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </FormField>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <FormField label="Вид работ" description="Например: строительство под ключ, кровля, электромонтаж." error={errorText(errors.workType?.message)}>
              <input className="stroy-input" placeholder="Строительство дома под ключ" {...register("workType")} />
            </FormField>

            <FormField label="Состав и объём работ" description="Перечислите ключевые работы, которые должны войти в предложение." error={errorText(errors.scopeDetails?.message)}>
              <textarea rows={6} className="stroy-textarea" placeholder="Фундамент, коробка, кровля, инженерные сети..." {...register("scopeDetails")} />
            </FormField>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Текущее состояние объекта" error={errorText(errors.currentCondition?.message)}>
                <input className="stroy-input" placeholder="Пустой участок / черновая отделка" {...register("currentCondition")} />
              </FormField>
              <FormField label="Размеры и количества" error={errorText(errors.dimensions?.message)}>
                <input className="stroy-input" placeholder="180 м², 2 этажа, участок 6 соток" {...register("dimensions")} />
              </FormField>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Уровень результата" error={errorText(errors.finishLevel?.message)}>
                <select className="stroy-select" {...register("finishLevel")}>
                  <option value="">Не определён</option>
                  <option value="basic">Базовый</option>
                  <option value="standard">Стандарт</option>
                  <option value="premium">Премиум</option>
                  <option value="custom">Индивидуальный</option>
                </select>
              </FormField>
              <FormField label="Предпочтения по материалам" error={errorText(errors.materialPreferences?.message)}>
                <input className="stroy-input" placeholder="Газоблок, металлочерепица, без предпочтений" {...register("materialPreferences")} />
              </FormField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Разрешения" error={errorText(errors.permitReadiness?.message)}>
                <select className="stroy-select" {...register("permitReadiness")}>
                  <option value="">Не указано</option>
                  <option value="not_needed">Не требуются</option>
                  <option value="not_started">Ещё не оформлялись</option>
                  <option value="in_progress">В процессе</option>
                  <option value="ready">Готовы</option>
                  <option value="unknown">Нужна консультация</option>
                </select>
              </FormField>
              <FormField label="Проект / дизайн" error={errorText(errors.designReadiness?.message)}>
                <select className="stroy-select" {...register("designReadiness")}>
                  <option value="">Не указано</option>
                  <option value="not_needed">Не требуется</option>
                  <option value="idea">Только идея</option>
                  <option value="in_progress">Разрабатывается</option>
                  <option value="ready">Готов</option>
                  <option value="unknown">Нужна консультация</option>
                </select>
              </FormField>
            </div>

            <FormField label="Адрес или ориентир" description="Точный адрес остаётся необязательным." error={errorText(errors.address?.message)}>
              <input className="stroy-input" placeholder="Район, улица или ориентир" {...register("address")} />
            </FormField>

            <FormField label="Условия выезда и доступа" description="Например: объект в горах, пропускной режим, ограниченный подъезд." error={errorText(errors.travelConstraints?.message)}>
              <textarea rows={4} className="stroy-textarea" placeholder="Особые условия доступа к объекту..." {...register("travelConstraints")} />
            </FormField>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Бюджет от, ₽" error={errorText(errors.budgetMin?.message)}>
                <input type="number" min="0" className="stroy-input" placeholder="1000000" {...register("budgetMin", { valueAsNumber: true })} />
              </FormField>
              <FormField label="Бюджет до, ₽" error={errorText(errors.budgetMax?.message)}>
                <input type="number" min="0" className="stroy-input" placeholder="3000000" {...register("budgetMax", { valueAsNumber: true })} />
              </FormField>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Желаемое начало" error={errorText(errors.desiredStartDate?.message)}>
                <input type="date" className="stroy-input" {...register("desiredStartDate")} />
              </FormField>
              <FormField label="Желаемое окончание" error={errorText(errors.desiredEndDate?.message)}>
                <input type="date" className="stroy-input" {...register("desiredEndDate")} />
              </FormField>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="font-semibold">Бриф готов к сохранению</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                После сохранения вы сможете проверить карточку проекта перед публикацией и увидеть рекомендованных подрядчиков.
              </p>
            </div>
          </div>
        )}
      </section>

      {message && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {message}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="sticky bottom-4 z-20 rounded-[1.5rem] border border-border bg-card/95 p-4 shadow-[var(--shadow-floating)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{activeProjectId ? "Черновик сохранён" : "Новый строительный бриф"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isDirty ? "Изменения сохраняются при переходе к следующему шагу." : "Можно продолжить заполнение."}
            </p>
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" disabled={isPending} onClick={() => setStep((value) => value - 1)} className="stroy-button stroy-button-secondary">
                <ArrowLeft className="h-4 w-4" /> Назад
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button type="button" disabled={isPending} onClick={nextStep} className="stroy-button stroy-button-primary">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Сохранить и продолжить
              </button>
            ) : (
              <button type="button" disabled={isPending} onClick={finish} className="stroy-button stroy-button-primary">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить проект
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function errorText(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
