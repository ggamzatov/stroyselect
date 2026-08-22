"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Save } from "lucide-react";

import { projectSchema, type ProjectInput } from "@/features/projects/schemas/project-schema";
import { saveProject } from "@/features/projects/actions/save-project";
import { FormField } from "@/components/stroy/forms/form-field";

type ProjectFormInput = z.input<typeof projectSchema>;
type Category = { id: number; name: string; slug?: string };

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
  key: "base" | "scope" | "readiness" | "budget";
  title: string;
  description: string;
  fields: FieldName[];
};

type IntakeMode =
  | "construction"
  | "finishing"
  | "engineering"
  | "cleaning"
  | "design"
  | "landscaping"
  | "demolition"
  | "installation";

type IntakeProfile = {
  mode: IntakeMode;
  scopeTitle: string;
  scopeDescription: string;
  workTypeLabel: string;
  workTypePlaceholder: string;
  scopeLabel: string;
  scopePlaceholder: string;
  conditionLabel: string;
  conditionPlaceholder: string;
  dimensionsLabel: string;
  dimensionsPlaceholder: string;
  finishLabel: string;
  materialsLabel: string;
  materialsPlaceholder: string;
  readinessTitle: string;
  readinessDescription: string;
  showCondition: boolean;
  showDimensions: boolean;
  showFinish: boolean;
  showMaterials: boolean;
  showPermits: boolean;
  showDesign: boolean;
  showAccess: boolean;
  showReadinessStep: boolean;
  accessLabel: string;
  accessDescription: string;
};

const CITIES = [
  "Махачкала", "Каспийск", "Дербент", "Хасавюрт",
  "Буйнакск", "Избербаш", "Кизляр", "Кизилюрт",
];

const BASE_FIELDS: FieldName[] = [
  "categoryId", "propertyType", "title", "description", "region", "city",
];
const BUDGET_FIELDS: FieldName[] = [
  "budgetMin", "budgetMax", "desiredStartDate", "desiredEndDate",
];

const PROFILE_BY_MODE: Record<IntakeMode, IntakeProfile> = {
  construction: {
    mode: "construction",
    scopeTitle: "Объём и состояние",
    scopeDescription: "Уточняем состав работ, состояние объекта, размеры и требования к результату.",
    workTypeLabel: "Вид работ",
    workTypePlaceholder: "Строительство дома под ключ",
    scopeLabel: "Состав и объём работ",
    scopePlaceholder: "Фундамент, коробка, кровля, инженерные сети...",
    conditionLabel: "Текущее состояние объекта",
    conditionPlaceholder: "Пустой участок / коробка / черновая отделка",
    dimensionsLabel: "Размеры и количества",
    dimensionsPlaceholder: "180 м², 2 этажа, участок 6 соток",
    finishLabel: "Уровень результата",
    materialsLabel: "Предпочтения по материалам",
    materialsPlaceholder: "Газоблок, металлочерепица, без предпочтений",
    readinessTitle: "Готовность к работам",
    readinessDescription: "Проверяем документацию и условия доступа до выезда подрядчика.",
    showCondition: true,
    showDimensions: true,
    showFinish: true,
    showMaterials: true,
    showPermits: true,
    showDesign: true,
    showAccess: true,
    showReadinessStep: true,
    accessLabel: "Условия выезда и доступа",
    accessDescription: "Например: пропускной режим, сложный подъезд, объект в горах.",
  },
  finishing: {
    mode: "finishing",
    scopeTitle: "Объём ремонта",
    scopeDescription: "Фиксируем помещения, текущее состояние, площадь и желаемый уровень отделки.",
    workTypeLabel: "Вид ремонта",
    workTypePlaceholder: "Капитальный ремонт / косметический ремонт",
    scopeLabel: "Какие работы нужны",
    scopePlaceholder: "Демонтаж старой отделки, электрика, стены, полы, санузел...",
    conditionLabel: "Состояние помещений сейчас",
    conditionPlaceholder: "Новостройка без отделки / вторичка / требуется демонтаж",
    dimensionsLabel: "Площадь и количество помещений",
    dimensionsPlaceholder: "Квартира 82 м², 3 комнаты, 2 санузла",
    finishLabel: "Уровень отделки",
    materialsLabel: "Материалы и бренды",
    materialsPlaceholder: "Материалы подрядчика / уже закуплены / есть предпочтения",
    readinessTitle: "Подготовка объекта",
    readinessDescription: "Уточняем наличие дизайн-проекта, адрес и доступ на объект.",
    showCondition: true,
    showDimensions: true,
    showFinish: true,
    showMaterials: true,
    showPermits: false,
    showDesign: true,
    showAccess: true,
    showReadinessStep: true,
    accessLabel: "Условия доступа",
    accessDescription: "Лифт, этаж, время шумных работ, пропускной режим, парковка.",
  },
  engineering: {
    mode: "engineering",
    scopeTitle: "Система и объём работ",
    scopeDescription: "Уточняем инженерную систему, исходное состояние, объём и оборудование.",
    workTypeLabel: "Вид инженерных работ",
    workTypePlaceholder: "Электромонтаж / отопление / вентиляция / сантехника",
    scopeLabel: "Что нужно выполнить",
    scopePlaceholder: "Монтаж щита, разводка линий, установка оборудования, пусконаладка...",
    conditionLabel: "Состояние системы сейчас",
    conditionPlaceholder: "Новая система / модернизация / аварийное состояние",
    dimensionsLabel: "Объём и ключевые параметры",
    dimensionsPlaceholder: "Дом 220 м², 3 фазы, 24 точки / 12 радиаторов",
    finishLabel: "Уровень результата",
    materialsLabel: "Оборудование и бренды",
    materialsPlaceholder: "Оборудование уже куплено / нужен подбор / предпочитаемые бренды",
    readinessTitle: "Исходные данные",
    readinessDescription: "Проверяем проект инженерных сетей, адрес и условия доступа.",
    showCondition: true,
    showDimensions: true,
    showFinish: false,
    showMaterials: true,
    showPermits: false,
    showDesign: true,
    showAccess: true,
    showReadinessStep: true,
    accessLabel: "Условия доступа и подключения",
    accessDescription: "Щитовая, техпомещения, пропускной режим, ограничения по времени работ.",
  },
  cleaning: {
    mode: "cleaning",
    scopeTitle: "Объём и условия уборки",
    scopeDescription: "Уточняем тип клининга, площадь, загрязнение и особенности объекта.",
    workTypeLabel: "Вид клининга",
    workTypePlaceholder: "Генеральная / после ремонта / регулярная уборка",
    scopeLabel: "Что нужно убрать",
    scopePlaceholder: "Полы, окна, кухня, санузлы, мебель, удаление строительной пыли...",
    conditionLabel: "Степень загрязнения",
    conditionPlaceholder: "Обычное / сильное / после ремонта",
    dimensionsLabel: "Площадь и количество помещений",
    dimensionsPlaceholder: "120 м², 4 комнаты, 2 санузла, 8 окон",
    finishLabel: "Уровень результата",
    materialsLabel: "Материалы",
    materialsPlaceholder: "",
    readinessTitle: "",
    readinessDescription: "",
    showCondition: true,
    showDimensions: true,
    showFinish: false,
    showMaterials: false,
    showPermits: false,
    showDesign: false,
    showAccess: false,
    showReadinessStep: false,
    accessLabel: "",
    accessDescription: "",
  },
  design: {
    mode: "design",
    scopeTitle: "Задача и исходные данные",
    scopeDescription: "Уточняем тип проекта, площадь, текущее состояние и состав результата.",
    workTypeLabel: "Что нужно спроектировать",
    workTypePlaceholder: "Дизайн интерьера / архитектурный проект / рабочая документация",
    scopeLabel: "Что должно войти в результат",
    scopePlaceholder: "Планировки, визуализации, рабочие чертежи, ведомости...",
    conditionLabel: "Стадия объекта",
    conditionPlaceholder: "Идея / существующий объект / строящийся объект",
    dimensionsLabel: "Площадь и основные параметры",
    dimensionsPlaceholder: "Квартира 95 м² / дом 240 м² / участок 10 соток",
    finishLabel: "Уровень результата",
    materialsLabel: "Материалы",
    materialsPlaceholder: "",
    readinessTitle: "",
    readinessDescription: "",
    showCondition: true,
    showDimensions: true,
    showFinish: false,
    showMaterials: false,
    showPermits: false,
    showDesign: false,
    showAccess: false,
    showReadinessStep: false,
    accessLabel: "",
    accessDescription: "",
  },
  landscaping: {
    mode: "landscaping",
    scopeTitle: "Участок и объём работ",
    scopeDescription: "Уточняем состояние территории, площадь и необходимые работы.",
    workTypeLabel: "Вид работ на участке",
    workTypePlaceholder: "Благоустройство / озеленение / дорожки / дренаж",
    scopeLabel: "Что нужно сделать",
    scopePlaceholder: "Планировка, газон, дорожки, освещение, полив, дренаж...",
    conditionLabel: "Состояние участка сейчас",
    conditionPlaceholder: "Пустой участок / есть старое благоустройство / сложный рельеф",
    dimensionsLabel: "Площадь и параметры участка",
    dimensionsPlaceholder: "10 соток, перепад высот 2 м, 80 м дорожек",
    finishLabel: "Уровень результата",
    materialsLabel: "Материалы и растения",
    materialsPlaceholder: "Брусчатка, газон, растения или без предпочтений",
    readinessTitle: "Доступ к участку",
    readinessDescription: "Уточняем адрес, подъезд техники и ограничения на объекте.",
    showCondition: true,
    showDimensions: true,
    showFinish: false,
    showMaterials: true,
    showPermits: false,
    showDesign: false,
    showAccess: true,
    showReadinessStep: true,
    accessLabel: "Подъезд и доступ техники",
    accessDescription: "Ширина ворот, грунтовая дорога, ограничения для грузовой техники.",
  },
  demolition: {
    mode: "demolition",
    scopeTitle: "Объём демонтажа",
    scopeDescription: "Уточняем конструкцию, объём, состояние и особенности демонтажа.",
    workTypeLabel: "Вид демонтажа",
    workTypePlaceholder: "Снос здания / демонтаж перегородок / разбор покрытия",
    scopeLabel: "Что нужно демонтировать",
    scopePlaceholder: "Конструкции, этажность, вывоз мусора, сохранение отдельных элементов...",
    conditionLabel: "Состояние объекта",
    conditionPlaceholder: "Эксплуатируется / аварийный / пустой",
    dimensionsLabel: "Размеры и объём",
    dimensionsPlaceholder: "Дом 140 м², 2 этажа / 60 м² перегородок",
    finishLabel: "Уровень результата",
    materialsLabel: "Материалы",
    materialsPlaceholder: "",
    readinessTitle: "Допуски и доступ",
    readinessDescription: "Проверяем разрешения, адрес, подъезд техники и ограничения.",
    showCondition: true,
    showDimensions: true,
    showFinish: false,
    showMaterials: false,
    showPermits: true,
    showDesign: false,
    showAccess: true,
    showReadinessStep: true,
    accessLabel: "Доступ техники и ограничения",
    accessDescription: "Подъезд, соседние строения, отключение сетей, часы проведения работ.",
  },
  installation: {
    mode: "installation",
    scopeTitle: "Монтаж и комплектация",
    scopeDescription: "Уточняем что устанавливаем, количество, состояние места монтажа и комплектацию.",
    workTypeLabel: "Что нужно установить",
    workTypePlaceholder: "Окна / двери / ворота / потолки / оборудование",
    scopeLabel: "Состав монтажных работ",
    scopePlaceholder: "Демонтаж старого, монтаж нового, откосы, подключение, вывоз...",
    conditionLabel: "Состояние места монтажа",
    conditionPlaceholder: "Новый проём / требуется демонтаж / нужна подготовка",
    dimensionsLabel: "Количество и размеры",
    dimensionsPlaceholder: "6 окон, 2 двери / размеры проёмов",
    finishLabel: "Уровень результата",
    materialsLabel: "Изделия, оборудование и бренды",
    materialsPlaceholder: "Уже куплено / нужен подбор / желаемая марка",
    readinessTitle: "Доступ к объекту",
    readinessDescription: "Уточняем адрес и условия доставки и монтажа.",
    showCondition: true,
    showDimensions: true,
    showFinish: false,
    showMaterials: true,
    showPermits: false,
    showDesign: false,
    showAccess: true,
    showReadinessStep: true,
    accessLabel: "Условия доставки и монтажа",
    accessDescription: "Этаж, лифт, парковка, пропускной режим, место разгрузки.",
  },
};

function normalizeCategory(category?: Category) {
  return `${category?.slug ?? ""} ${category?.name ?? ""}`.toLocaleLowerCase("ru-RU");
}

function resolveIntakeMode(category?: Category): IntakeMode {
  const value = normalizeCategory(category);

  if (/клининг|уборк|clean/.test(value)) return "cleaning";
  if (/дизайн|проектир|архитект|визуализ|смет/.test(value)) return "design";
  if (/демонтаж|снос|разбор/.test(value)) return "demolition";
  if (/благоустрой|ландшафт|озелен|газон|дренаж/.test(value)) return "landscaping";
  if (/электр|сантех|отоплен|вентиляц|кондицион|инженер|газоснаб|водоснаб|канализац|слаботоч/.test(value)) return "engineering";
  if (/ремонт|отделк|плитк|маляр|штукатур|стяжк|обои|полы/.test(value)) return "finishing";
  if (/монтаж|установк|окн|двер|ворот|потол|мебел|оборудован/.test(value)) return "installation";

  return "construction";
}

function buildSteps(profile: IntakeProfile): Step[] {
  const scopeFields: FieldName[] = ["workType", "scopeDetails"];
  if (profile.showCondition) scopeFields.push("currentCondition");
  if (profile.showDimensions) scopeFields.push("dimensions");
  if (profile.showFinish) scopeFields.push("finishLevel");
  if (profile.showMaterials) scopeFields.push("materialPreferences");

  const steps: Step[] = [
    {
      key: "base",
      title: "Основное",
      description: "Категория, объект, задача и местоположение.",
      fields: BASE_FIELDS,
    },
    {
      key: "scope",
      title: profile.scopeTitle,
      description: profile.scopeDescription,
      fields: scopeFields,
    },
  ];

  if (profile.showReadinessStep) {
    const readinessFields: FieldName[] = ["address"];
    if (profile.showPermits) readinessFields.push("permitReadiness");
    if (profile.showDesign) readinessFields.push("designReadiness");
    if (profile.showAccess) readinessFields.push("travelConstraints");

    steps.push({
      key: "readiness",
      title: profile.readinessTitle,
      description: profile.readinessDescription,
      fields: readinessFields,
    });
  }

  steps.push({
    key: "budget",
    title: "Бюджет и сроки",
    description: "Фиксируем ориентиры по стоимости и времени выполнения.",
    fields: BUDGET_FIELDS,
  });

  return steps;
}

function sanitizeForProfile(values: ProjectInput, profile: IntakeProfile): ProjectInput {
  return {
    ...values,
    currentCondition: profile.showCondition ? values.currentCondition : "",
    dimensions: profile.showDimensions ? values.dimensions : "",
    finishLevel: profile.showFinish ? values.finishLevel : "",
    materialPreferences: profile.showMaterials ? values.materialPreferences : "",
    permitReadiness: profile.showPermits ? values.permitReadiness : "",
    designReadiness: profile.showDesign ? values.designReadiness : "",
    travelConstraints: profile.showAccess ? values.travelConstraints : "",
  };
}

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
    watch,
    setValue,
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

  const selectedCategoryId = watch("categoryId");
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === Number(selectedCategoryId)),
    [categories, selectedCategoryId],
  );
  const profile = useMemo(
    () => PROFILE_BY_MODE[resolveIntakeMode(selectedCategory)],
    [selectedCategory],
  );
  const steps = useMemo(() => buildSteps(profile), [profile]);
  const current = steps[Math.min(step, steps.length - 1)];
  const progress = useMemo(
    () => Math.round(((Math.min(step, steps.length - 1) + 1) / steps.length) * 100),
    [step, steps.length],
  );
  const previousCategoryId = useRef(Number(selectedCategoryId));

  useEffect(() => {
    if (step >= steps.length) setStep(steps.length - 1);
  }, [step, steps.length]);

  useEffect(() => {
    const currentCategoryId = Number(selectedCategoryId);
    if (!currentCategoryId || previousCategoryId.current === currentCategoryId) return;

    const hiddenFields: FieldName[] = [];
    if (!profile.showCondition) hiddenFields.push("currentCondition");
    if (!profile.showDimensions) hiddenFields.push("dimensions");
    if (!profile.showFinish) hiddenFields.push("finishLevel");
    if (!profile.showMaterials) hiddenFields.push("materialPreferences");
    if (!profile.showPermits) hiddenFields.push("permitReadiness");
    if (!profile.showDesign) hiddenFields.push("designReadiness");
    if (!profile.showAccess) hiddenFields.push("travelConstraints");

    for (const field of hiddenFields) {
      setValue(field, "" as never, { shouldDirty: true, shouldValidate: false });
    }

    setStep(0);
    setMessage("");
    setErrorMessage("");
    previousCategoryId.current = currentCategoryId;
  }, [profile, selectedCategoryId, setValue]);

  async function persistDraft(goToNext: boolean) {
    setMessage("");
    setErrorMessage("");

    const valid = await trigger(current.fields);
    if (!valid) return;

    const parsed = projectSchema.safeParse(getValues());
    if (!parsed.success) {
      const visibleFields = steps.slice(0, step + 1).flatMap((item) => item.fields);
      const firstVisibleIssue = parsed.error.issues.find((issue) =>
        visibleFields.includes(issue.path[0] as FieldName),
      );
      if (firstVisibleIssue) {
        setErrorMessage(firstVisibleIssue.message);
        return;
      }
    }

    const rawValues = parsed.success ? parsed.data : (getValues() as ProjectInput);
    const values = sanitizeForProfile(rawValues, profile);

    startTransition(async () => {
      const result = await saveProject(values, activeProjectId);
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      if (result.projectId && !activeProjectId) setActiveProjectId(result.projectId);
      setMessage("Черновик сохранён");

      if (goToNext && step < steps.length - 1) {
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
    const visibleFields = steps.flatMap((item) => item.fields);
    const valid = await trigger(visibleFields);
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
            <p className="text-sm font-semibold text-primary">Шаг {step + 1} из {steps.length}</p>
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

        <div className={`mt-5 grid gap-2 ${steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
          {steps.map((item, index) => (
            <button
              key={item.key}
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
        {current.key === "base" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Категория работ" required error={errorText(errors.categoryId?.message)}>
                <select className="stroy-select" {...register("categoryId", { valueAsNumber: true })}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
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
              <input className="stroy-input" placeholder="Коротко назовите задачу" {...register("title")} />
            </FormField>

            <FormField
              label="Что нужно сделать"
              description="Опишите ожидаемый результат понятным языком."
              required
              error={errorText(errors.description?.message)}
            >
              <textarea
                rows={6}
                className="stroy-textarea"
                placeholder="Опишите объект, задачу и желаемый результат..."
                {...register("description")}
              />
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

        {current.key === "scope" && (
          <div className="space-y-6">
            <FormField label={profile.workTypeLabel} error={errorText(errors.workType?.message)}>
              <input className="stroy-input" placeholder={profile.workTypePlaceholder} {...register("workType")} />
            </FormField>

            <FormField
              label={profile.scopeLabel}
              description="Перечислите ключевые работы или услуги, которые должны войти в предложение."
              error={errorText(errors.scopeDetails?.message)}
            >
              <textarea
                rows={6}
                className="stroy-textarea"
                placeholder={profile.scopePlaceholder}
                {...register("scopeDetails")}
              />
            </FormField>

            {(profile.showCondition || profile.showDimensions) && (
              <div className="grid gap-6 md:grid-cols-2">
                {profile.showCondition && (
                  <FormField label={profile.conditionLabel} error={errorText(errors.currentCondition?.message)}>
                    <input className="stroy-input" placeholder={profile.conditionPlaceholder} {...register("currentCondition")} />
                  </FormField>
                )}
                {profile.showDimensions && (
                  <FormField label={profile.dimensionsLabel} error={errorText(errors.dimensions?.message)}>
                    <input className="stroy-input" placeholder={profile.dimensionsPlaceholder} {...register("dimensions")} />
                  </FormField>
                )}
              </div>
            )}

            {(profile.showFinish || profile.showMaterials) && (
              <div className="grid gap-6 md:grid-cols-2">
                {profile.showFinish && (
                  <FormField label={profile.finishLabel} error={errorText(errors.finishLevel?.message)}>
                    <select className="stroy-select" {...register("finishLevel")}>
                      <option value="">Не определён</option>
                      <option value="basic">Базовый</option>
                      <option value="standard">Стандарт</option>
                      <option value="premium">Премиум</option>
                      <option value="custom">Индивидуальный</option>
                    </select>
                  </FormField>
                )}
                {profile.showMaterials && (
                  <FormField label={profile.materialsLabel} error={errorText(errors.materialPreferences?.message)}>
                    <input className="stroy-input" placeholder={profile.materialsPlaceholder} {...register("materialPreferences")} />
                  </FormField>
                )}
              </div>
            )}
          </div>
        )}

        {current.key === "readiness" && (
          <div className="space-y-6">
            {(profile.showPermits || profile.showDesign) && (
              <div className="grid gap-6 md:grid-cols-2">
                {profile.showPermits && (
                  <FormField label="Разрешения и допуски" error={errorText(errors.permitReadiness?.message)}>
                    <select className="stroy-select" {...register("permitReadiness")}>
                      <option value="">Не указано</option>
                      <option value="not_needed">Не требуются</option>
                      <option value="not_started">Ещё не оформлялись</option>
                      <option value="in_progress">В процессе</option>
                      <option value="ready">Готовы</option>
                      <option value="unknown">Нужна консультация</option>
                    </select>
                  </FormField>
                )}
                {profile.showDesign && (
                  <FormField label="Проект / схема / дизайн" error={errorText(errors.designReadiness?.message)}>
                    <select className="stroy-select" {...register("designReadiness")}>
                      <option value="">Не указано</option>
                      <option value="not_needed">Не требуется</option>
                      <option value="idea">Только идея</option>
                      <option value="in_progress">Разрабатывается</option>
                      <option value="ready">Готов</option>
                      <option value="unknown">Нужна консультация</option>
                    </select>
                  </FormField>
                )}
              </div>
            )}

            <FormField
              label="Адрес или ориентир"
              description="Точный адрес остаётся необязательным."
              error={errorText(errors.address?.message)}
            >
              <input className="stroy-input" placeholder="Район, улица или ориентир" {...register("address")} />
            </FormField>

            {profile.showAccess && (
              <FormField
                label={profile.accessLabel}
                description={profile.accessDescription}
                error={errorText(errors.travelConstraints?.message)}
              >
                <textarea rows={4} className="stroy-textarea" {...register("travelConstraints")} />
              </FormField>
            )}
          </div>
        )}

        {current.key === "budget" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Бюджет от, ₽" error={errorText(errors.budgetMin?.message)}>
                <input type="number" min="0" className="stroy-input" placeholder="300000" {...register("budgetMin")} />
              </FormField>
              <FormField label="Бюджет до, ₽" error={errorText(errors.budgetMax?.message)}>
                <input type="number" min="0" className="stroy-input" placeholder="600000" {...register("budgetMax")} />
              </FormField>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Желаемое начало" error={errorText(errors.desiredStartDate?.message)}>
                <input type="date" className="stroy-input" {...register("desiredStartDate")} />
              </FormField>
              <FormField label="Желаемое завершение" error={errorText(errors.desiredEndDate?.message)}>
                <input type="date" className="stroy-input" {...register("desiredEndDate")} />
              </FormField>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-6 text-muted-foreground">
              Бюджет и даты можно оставить ориентировочными. Они используются для фильтрации подрядчиков,
              но не являются договорной ценой или окончательным сроком.
            </div>
          </div>
        )}

        {(message || errorMessage) && (
          <div className="mt-6" aria-live="polite">
            {errorMessage ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                {errorMessage}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={step === 0 || isPending}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isDirty && activeProjectId && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => void persistDraft(false)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Сохранить
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => void nextStep()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Сохранить и продолжить
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => void finish()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Сохранить проект
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function errorText(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
