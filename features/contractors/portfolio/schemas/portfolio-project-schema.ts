import { z } from "zod";

const optionalYear = z.preprocess(
  (value) => {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return undefined;
    }

    const number =
      Number(value);

    return Number.isNaN(number)
      ? value
      : number;
  },
  z
    .number()
    .int()
    .min(
      1900,
      "Укажите корректный год"
    )
    .max(
      new Date().getFullYear(),
      "Год не может быть в будущем"
    )
    .optional()
);

export const portfolioProjectSchema =
  z.object({
    portfolioProjectId:
      z.preprocess(
        (value) => {
          if (
            value === "" ||
            value === null ||
            value === undefined
          ) {
            return undefined;
          }

          return value;
        },
        z
          .string()
          .uuid()
          .optional()
      ),

    title: z
      .string()
      .trim()
      .min(
        2,
        "Название должно содержать минимум 2 символа"
      )
      .max(
        150,
        "Название слишком длинное"
      ),

    description: z
      .string()
      .trim()
      .max(
        3000,
        "Описание слишком длинное"
      )
      .optional()
      .or(z.literal("")),

    city: z
      .string()
      .trim()
      .max(
        120,
        "Название города слишком длинное"
      )
      .optional()
      .or(z.literal("")),

    completedYear:
      optionalYear,
  });

export type PortfolioProjectInput =
  z.output<
    typeof portfolioProjectSchema
  >;

export type PortfolioProjectFormInput =
  z.input<
    typeof portfolioProjectSchema
  >;