import "server-only";

import { db } from
  "@/lib/db/pool";

type ReviewProject = {
  id: string;
  title: string;
  city: string | null;
};

type ReviewProfile = {
  id: string;
  first_name: string;
  last_name: string | null;
};

type ContractorReviewRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  customer_id: string;

  rating: number | string;

  quality_rating:
    number | string | null;

  deadline_rating:
    number | string | null;

  communication_rating:
    number | string | null;

  comment: string | null;

  created_at:
    Date | string;

  updated_at:
    Date | string;

  project_id_join:
    string | null;

  project_title:
    string | null;

  project_city:
    string | null;

  profile_id:
    string | null;

  profile_first_name:
    string | null;

  profile_last_name:
    string | null;
};

export async function getContractorReviews(
  contractorId: string
) {
  try {
    /*
     * PostgreSQL позволяет получить
     * отзывы, проекты и авторов
     * одним запросом.
     */
    const result =
      await db.query<ContractorReviewRow>(
        `
          SELECT
            cr.id,
            cr.project_id,
            cr.contractor_id,
            cr.customer_id,

            cr.rating,
            cr.quality_rating,
            cr.deadline_rating,
            cr.communication_rating,

            cr.comment,

            cr.created_at,
            cr.updated_at,

            p.id
              AS project_id_join,

            p.title
              AS project_title,

            p.city
              AS project_city,

            profile.id
              AS profile_id,

            profile.first_name
              AS profile_first_name,

            profile.last_name
              AS profile_last_name

          FROM
            public.contractor_reviews
              cr

          LEFT JOIN
            public.projects
              p
            ON p.id =
              cr.project_id

          LEFT JOIN
            public.profiles
              profile
            ON profile.id =
              cr.customer_id

          WHERE
            cr.contractor_id =
              $1

          ORDER BY
            cr.created_at DESC
        `,
        [
          contractorId,
        ]
      );

    const items =
      result.rows.map(
        (row) => {
          const project:
            ReviewProject | null =
            row.project_id_join
              ? {
                  id:
                    row.project_id_join,

                  title:
                    row.project_title ??
                    "Проект",

                  city:
                    row.project_city,
                }
              : null;

          const profile:
            ReviewProfile | null =
            row.profile_id
              ? {
                  id:
                    row.profile_id,

                  first_name:
                    row.profile_first_name ??
                    "Заказчик",

                  last_name:
                    row.profile_last_name,
                }
              : null;

          return {
            id:
              row.id,

            project_id:
              row.project_id,

            contractor_id:
              row.contractor_id,

            customer_id:
              row.customer_id,

            rating:
              Number(
                row.rating
              ),

            quality_rating:
              toNullableNumber(
                row.quality_rating
              ),

            deadline_rating:
              toNullableNumber(
                row.deadline_rating
              ),

            communication_rating:
              toNullableNumber(
                row.communication_rating
              ),

            comment:
              row.comment,

            created_at:
              toIsoString(
                row.created_at
              ),

            updated_at:
              toIsoString(
                row.updated_at
              ),

            /*
             * Сохраняем те же имена,
             * которые ожидает UI.
             */
            projects:
              project,

            profiles:
              profile,
          };
        }
      );

    const total =
      items.length;

    const averageRating =
      getAverage(
        items.map(
          (review) =>
            review.rating
        )
      );

    const averageQuality =
      getAverage(
        items
          .map(
            (review) =>
              review
                .quality_rating
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          )
      );

    const averageDeadline =
      getAverage(
        items
          .map(
            (review) =>
              review
                .deadline_rating
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          )
      );

    const averageCommunication =
      getAverage(
        items
          .map(
            (review) =>
              review
                .communication_rating
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          )
      );

    const distribution = {
      5:
        items.filter(
          (review) =>
            review.rating === 5
        ).length,

      4:
        items.filter(
          (review) =>
            review.rating === 4
        ).length,

      3:
        items.filter(
          (review) =>
            review.rating === 3
        ).length,

      2:
        items.filter(
          (review) =>
            review.rating === 2
        ).length,

      1:
        items.filter(
          (review) =>
            review.rating === 1
        ).length,
    };

    return {
      reviews:
        items,

      total,

      averageRating,

      averageQuality,

      averageDeadline,

      averageCommunication,

      distribution,
    };
  } catch (error) {
    console.error(
      "Ошибка загрузки отзывов подрядчика:",
      error
    );

    throw new Error(
      "Не удалось загрузить отзывы"
    );
  }
}

function getAverage(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return 0;
  }

  const sum =
    values.reduce(
      (
        current,
        value
      ) =>
        current +
        Number(value),
      0
    );

  return Number(
    (
      sum /
      values.length
    ).toFixed(1)
  );
}

function toNullableNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function toIsoString(
  value:
    Date | string
) {
  if (
    value instanceof Date
  ) {
    return value
      .toISOString();
  }

  return String(value);
}