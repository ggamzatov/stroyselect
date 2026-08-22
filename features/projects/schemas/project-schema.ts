import { z } from "zod";

const optionalNumber = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : Number(value),
  z.number().optional()
);

const optionalDate = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : String(value),
  z.string().optional()
);

const optionalText = (max: number) =>
  z.string().trim().max(max, "Поле слишком длинное").optional().or(z.literal(""));

export const projectSchema = z
  .object({
    categoryId: z.number().int().positive("Выберите категорию работ"),
    title: z.string().trim().min(5, "Название должно содержать минимум 5 символов").max(150, "Название слишком длинное"),
    description: z.string().trim().min(30, "Описание должно содержать минимум 30 символов").max(5000, "Описание слишком длинное"),
    propertyType: z.enum(["apartment", "private_house", "commercial", "land", "industrial", "other"]),
    workType: optionalText(120),
    scopeDetails: optionalText(5000),
    currentCondition: optionalText(80),
    finishLevel: z.enum(["basic", "standard", "premium", "custom"]).optional().or(z.literal("")),
    dimensions: optionalText(1000),
    materialPreferences: optionalText(2000),
    permitReadiness: z.enum(["not_needed", "not_started", "in_progress", "ready", "unknown"]).optional().or(z.literal("")),
    designReadiness: z.enum(["not_needed", "idea", "in_progress", "ready", "unknown"]).optional().or(z.literal("")),
    travelConstraints: optionalText(1000),
    region: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2, "Выберите город").max(100),
    address: optionalText(300),
    budgetMin: optionalNumber.refine((value) => value === undefined || value >= 0, "Бюджет не может быть отрицательным"),
    budgetMax: optionalNumber.refine((value) => value === undefined || value > 0, "Укажите корректный бюджет"),
    desiredStartDate: optionalDate,
    desiredEndDate: optionalDate,
  })
  .refine(
    (data) => data.budgetMin === undefined || data.budgetMax === undefined || data.budgetMax >= data.budgetMin,
    { path: ["budgetMax"], message: "Максимальный бюджет не может быть меньше минимального" }
  )
  .refine(
    (data) => !data.desiredStartDate || !data.desiredEndDate || new Date(data.desiredEndDate) >= new Date(data.desiredStartDate),
    { path: ["desiredEndDate"], message: "Дата окончания не может быть раньше даты начала" }
  );

export type ProjectInput = z.infer<typeof projectSchema>;
