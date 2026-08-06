import { z } from "zod";

const optionalDateSchema =
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
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Укажите корректную дату"
      )
      .optional()
  );

const optionalMessageSchema =
  z.preprocess(
    (value) => {
      if (
        value === null ||
        value === undefined
      ) {
        return undefined;
      }

      if (
        typeof value === "string" &&
        value.trim() === ""
      ) {
        return undefined;
      }

      return value;
    },
    z
      .string()
      .trim()
      .min(
        20,
        "Комментарий должен содержать не менее 20 символов"
      )
      .max(
        3000,
        "Комментарий не должен превышать 3000 символов"
      )
      .optional()
  );

const positiveNumberSchema =
  (
    fieldName: string,
    minimum: number,
    maximum: number
  ) =>
    z.preprocess(
      (value) => {
        if (
          value === "" ||
          value === null ||
          value === undefined
        ) {
          return undefined;
        }

        if (
          typeof value === "string"
        ) {
          const normalized =
            value
              .replace(/\s+/g, "")
              .replace(",", ".");

          const numberValue =
            Number(normalized);

          return Number.isNaN(
            numberValue
          )
            ? value
            : numberValue;
        }

        return value;
      },
      z
        .number({
          message:
            `${fieldName} должно быть числом`,
        })
        .finite(
          `${fieldName} должно быть корректным числом`
        )
        .min(
          minimum,
          `${fieldName} не может быть меньше ${minimum}`
        )
        .max(
          maximum,
          `${fieldName} не может быть больше ${maximum}`
        )
    );

export const bidSchema =
  z
    .object({
      projectId: z
        .string()
        .uuid(
          "Некорректный идентификатор проекта"
        ),

      price:
        positiveNumberSchema(
          "Стоимость",
          1,
          1_000_000_000
        ),

      durationDays:
        z.preprocess(
          (value) => {
            if (
              value === "" ||
              value === null ||
              value === undefined
            ) {
              return undefined;
            }

            if (
              typeof value ===
              "string"
            ) {
              const numberValue =
                Number(
                  value.replace(
                    /\s+/g,
                    ""
                  )
                );

              return Number.isNaN(
                numberValue
              )
                ? value
                : numberValue;
            }

            return value;
          },
          z
            .number({
              message:
                "Срок должен быть числом",
            })
            .int(
              "Срок должен быть указан в целых днях"
            )
            .min(
              1,
              "Срок должен быть не менее 1 дня"
            )
            .max(
              3650,
              "Срок не может превышать 10 лет"
            )
        ),

      proposedStartDate:
        optionalDateSchema,

      message:
        optionalMessageSchema,
    })
    .superRefine(
      (
        values,
        context
      ) => {
        if (
          !values
            .proposedStartDate
        ) {
          return;
        }

        const proposedDate =
          parseDateOnly(
            values
              .proposedStartDate
          );

        if (!proposedDate) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "proposedStartDate",
            ],
            message:
              "Укажите корректную дату начала",
          });

          return;
        }

        const today =
          getTodayDateOnly();

        if (
          proposedDate <
          today
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "proposedStartDate",
            ],
            message:
              "Дата начала не может быть в прошлом",
          });
        }
      }
    );

export type BidFormInput =
  z.input<typeof bidSchema>;

export type BidInput =
  z.output<typeof bidSchema>;

function parseDateOnly(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  const isValid =
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() ===
      day;

  return isValid
    ? date
    : null;
}

function getTodayDateOnly() {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}