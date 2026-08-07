import { createClient } from
  "@/lib/supabase/server";

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

export async function getContractorReviews(
  contractorId: string
) {
  const supabase =
    await createClient();

  /*
   * 1. Загружаем отзывы.
   *
   * profiles здесь намеренно НЕ подключаем,
   * потому что customer_id ссылается на auth.users,
   * а не напрямую на profiles.
   */
  const {
    data: reviews,
    error: reviewsError,
  } = await supabase
    .from("contractor_reviews")
    .select(`
      id,
      project_id,
      contractor_id,
      customer_id,
      rating,
      quality_rating,
      deadline_rating,
      communication_rating,
      comment,
      created_at,
      updated_at,

      projects (
        id,
        title,
        city
      )
    `)
    .eq(
      "contractor_id",
      contractorId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (reviewsError) {
    console.error(
      "Ошибка загрузки отзывов подрядчика:",
      {
        message:
          reviewsError.message,

        details:
          reviewsError.details,

        hint:
          reviewsError.hint,

        code:
          reviewsError.code,
      }
    );

    throw new Error(
      "Не удалось загрузить отзывы"
    );
  }

  const reviewItems =
    reviews ?? [];

  /*
   * 2. Получаем уникальные id заказчиков.
   */
  const customerIds =
    Array.from(
      new Set(
        reviewItems
          .map(
            (review) =>
              review.customer_id
          )
          .filter(Boolean)
      )
    );

  /*
   * 3. Загружаем профили заказчиков
   * отдельным запросом.
   */
  let profiles:
    ReviewProfile[] = [];

  if (
    customerIds.length >
    0
  ) {
    const {
      data:
        profileData,
      error:
        profilesError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name
      `)
      .in(
        "id",
        customerIds
      );

    if (profilesError) {
      console.error(
        "Ошибка загрузки профилей авторов отзывов:",
        {
          message:
            profilesError.message,

          details:
            profilesError.details,

          hint:
            profilesError.hint,

          code:
            profilesError.code,
        }
      );

      /*
       * Отзывы всё равно показываем.
       * Просто вместо имени будет "Заказчик".
       */
      profiles = [];
    } else {
      profiles =
        profileData ?? [];
    }
  }

  /*
   * 4. Соединяем отзывы и профили вручную.
   *
   * Компонент ContractorReviews уже ожидает
   * поле profiles, поэтому сохраняем это имя.
   */
  const items =
    reviewItems.map(
      (review) => {
        const profile =
          profiles.find(
            (item) =>
              item.id ===
              review.customer_id
          ) ?? null;

        return {
          ...review,

          profiles:
            profile,
        };
      }
    );

  /*
   * 5. Рассчитываем общую статистику.
   */

  const total =
    items.length;

  const averageRating =
    getAverage(
      items.map(
        (review) =>
          Number(
            review.rating
          )
      )
    );

  const averageQuality =
    getAverage(
      items
        .map(
          (review) =>
            review.quality_rating
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        )
        .map(Number)
    );

  const averageDeadline =
    getAverage(
      items
        .map(
          (review) =>
            review.deadline_rating
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        )
        .map(Number)
    );

  const averageCommunication =
    getAverage(
      items
        .map(
          (review) =>
            review.communication_rating
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        )
        .map(Number)
    );

  const distribution = {
    5:
      items.filter(
        (review) =>
          Number(
            review.rating
          ) === 5
      ).length,

    4:
      items.filter(
        (review) =>
          Number(
            review.rating
          ) === 4
      ).length,

    3:
      items.filter(
        (review) =>
          Number(
            review.rating
          ) === 3
      ).length,

    2:
      items.filter(
        (review) =>
          Number(
            review.rating
          ) === 2
      ).length,

    1:
      items.filter(
        (review) =>
          Number(
            review.rating
          ) === 1
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