import { z } from "zod";

const ratingField =
  z
    .number()
    .int()
    .min(1, "Оценка не может быть меньше 1")
    .max(5, "Оценка не может быть больше 5");

const optionalRatingField =
  z.preprocess(
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
      .min(1)
      .max(5)
      .optional()
  );

export const contractorReviewSchema =
  z.object({
    projectId: z
      .string()
      .uuid(
        "Некорректный идентификатор проекта"
      ),

    rating:
      ratingField,

    qualityRating:
      optionalRatingField,

    deadlineRating:
      optionalRatingField,

    communicationRating:
      optionalRatingField,

    comment: z
      .string()
      .trim()
      .max(
        3000,
        "Отзыв слишком длинный"
      )
      .optional()
      .or(z.literal("")),
  });

export type ContractorReviewInput =
  z.output<
    typeof contractorReviewSchema
  >;

export type ContractorReviewFormInput =
  z.input<
    typeof contractorReviewSchema
  >;