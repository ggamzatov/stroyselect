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

export const contractorCompanySchema = z
  .object({
    publicName: z
      .string()
      .trim()
      .min(2, "Введите название")
      .max(100, "Название слишком длинное"),

    legalName: z
      .string()
      .trim()
      .max(200, "Юридическое название слишком длинное")
      .optional()
      .or(z.literal("")),

    companyType: z.enum([
      "individual",
      "self_employed",
      "entrepreneur",
      "company",
    ]),

    inn: z
      .string()
      .trim()
      .regex(
        /^(\d{10}|\d{12})?$/,
        "ИНН должен содержать 10 или 12 цифр"
      )
      .optional()
      .or(z.literal("")),

    ogrn: z
      .string()
      .trim()
      .regex(
        /^(\d{13}|\d{15})?$/,
        "ОГРН должен содержать 13 или 15 цифр"
      )
      .optional()
      .or(z.literal("")),

    description: z
      .string()
      .trim()
      .min(50, "Добавьте описание минимум из 50 символов")
      .max(3000, "Описание слишком длинное"),

    foundedYear: optionalNumber.refine(
      (value) =>
        value === undefined ||
        (value >= 1900 &&
          value <= new Date().getFullYear()),
      "Введите корректный год"
    ),

    employeeCount: optionalNumber.refine(
      (value) =>
        value === undefined ||
        (Number.isInteger(value) &&
          value >= 1 &&
          value <= 100000),
      "Введите корректное количество сотрудников"
    ),

    minimumProjectBudget: optionalNumber.refine(
      (value) =>
        value === undefined || value >= 0,
      "Минимальный бюджет не может быть отрицательным"
    ),

    maximumProjectBudget: optionalNumber.refine(
      (value) =>
        value === undefined || value > 0,
      "Максимальный бюджет должен быть больше нуля"
    ),

    contactPhone: z
      .string()
      .trim()
      .min(7, "Введите телефон")
      .max(30, "Телефон слишком длинный"),

    contactEmail: z
      .string()
      .trim()
      .email("Введите корректный email")
      .optional()
      .or(z.literal("")),

    website: z
      .string()
      .trim()
      .url("Введите полный адрес сайта")
      .optional()
      .or(z.literal("")),

    telegram: z
      .string()
      .trim()
      .max(100)
      .optional()
      .or(z.literal("")),

    acceptsNewProjects: z.boolean(),

    categoryIds: z
      .array(z.number().int().positive())
      .min(1, "Выберите хотя бы одну услугу"),

    cities: z
      .array(z.string().min(2))
      .min(1, "Выберите хотя бы один город"),
  })
  .refine(
    (data) => {
      if (
        data.minimumProjectBudget === undefined ||
        data.maximumProjectBudget === undefined
      ) {
        return true;
      }

      return (
        data.maximumProjectBudget >=
        data.minimumProjectBudget
      );
    },
    {
      message:
        "Максимальный бюджет не может быть меньше минимального",
      path: ["maximumProjectBudget"],
    }
  );

export type ContractorCompanyFormInput = z.input<
  typeof contractorCompanySchema
>;

export type ContractorCompanyInput = z.output<
  typeof contractorCompanySchema
>;