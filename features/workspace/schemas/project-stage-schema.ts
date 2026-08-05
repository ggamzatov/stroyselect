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

    const number = Number(value);

    return Number.isNaN(number)
      ? value
      : number;
  },
  z
    .number()
    .nonnegative(
      "Значение не может быть отрицательным"
    )
    .optional()
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

    return value;
  },
  z.string().date().optional()
);

export const projectStageSchema = z
  .object({
    projectId: z
      .string()
      .uuid("Некорректный идентификатор проекта"),

    stageId: z.preprocess(
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
      z.string().uuid().optional()
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

    price: optionalNumber,

    progressWeight: z.preprocess(
      (value) => {
        if (
          value === "" ||
          value === null ||
          value === undefined
        ) {
          return 0;
        }

        const number = Number(value);

        return Number.isNaN(number)
          ? value
          : number;
      },
      z
        .number()
        .int()
        .min(
          0,
          "Процент не может быть меньше 0"
        )
        .max(
          100,
          "Процент не может быть больше 100"
        )
    ),

    plannedStartDate: optionalDate,

    plannedEndDate: optionalDate,
  })
  .refine(
    (data) => {
      if (
        !data.plannedStartDate ||
        !data.plannedEndDate
      ) {
        return true;
      }

      return (
        new Date(data.plannedEndDate) >=
        new Date(data.plannedStartDate)
      );
    },
    {
      path: ["plannedEndDate"],
      message:
        "Дата окончания не может быть раньше даты начала",
    }
  );

export type ProjectStageInput =
  z.output<typeof projectStageSchema>;

export type ProjectStageFormInput =
  z.input<typeof projectStageSchema>;