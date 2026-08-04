import { z } from "zod";

const optionalNumber = z.preprocess(
  (value) => {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return undefined;
    }

    return Number(value);
  },
  z.number().optional()
);

const optionalDate = z.preprocess(
  (value) => {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return undefined;
    }

    return String(value);
  },
  z.string().optional()
);

export const projectSchema = z
  .object({
    categoryId: z
      .number()
      .int()
      .positive("Выберите категорию работ"),

    title: z
      .string()
      .trim()
      .min(
        5,
        "Название должно содержать минимум 5 символов"
      )
      .max(150, "Название слишком длинное"),

    description: z
      .string()
      .trim()
      .min(
        30,
        "Описание должно содержать минимум 30 символов"
      )
      .max(5000, "Описание слишком длинное"),

    propertyType: z.enum([
      "apartment",
      "private_house",
      "commercial",
      "land",
      "industrial",
      "other",
    ]),

    region: z
      .string()
      .trim()
      .min(2)
      .max(100),

    city: z
      .string()
      .trim()
      .min(2, "Выберите город")
      .max(100),

    address: z
      .string()
      .trim()
      .max(300, "Адрес слишком длинный")
      .optional()
      .or(z.literal("")),

    budgetMin: optionalNumber.refine(
      (value) =>
        value === undefined || value >= 0,
      "Бюджет не может быть отрицательным"
    ),

    budgetMax: optionalNumber.refine(
      (value) =>
        value === undefined || value > 0,
      "Укажите корректный бюджет"
    ),

    desiredStartDate: optionalDate,
    desiredEndDate: optionalDate,
  })
  .refine(
    (data) => {
      if (
        data.budgetMin === undefined ||
        data.budgetMax === undefined
      ) {
        return true;
      }

      return data.budgetMax >= data.budgetMin;
    },
    {
      path: ["budgetMax"],
      message:
        "Максимальный бюджет не может быть меньше минимального",
    }
  )
  .refine(
    (data) => {
      if (
        !data.desiredStartDate ||
        !data.desiredEndDate
      ) {
        return true;
      }

      return (
        new Date(data.desiredEndDate) >=
        new Date(data.desiredStartDate)
      );
    },
    {
      path: ["desiredEndDate"],
      message:
        "Дата окончания не может быть раньше даты начала",
    }
  );

export type ProjectInput = z.infer<
  typeof projectSchema
>;