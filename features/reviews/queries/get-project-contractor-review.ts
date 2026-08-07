import { createClient } from
  "@/lib/supabase/server";

export async function getProjectContractorReview(
  projectId: string
) {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return null;
  }

  const {
    data: review,
    error,
  } = await supabase
    .from(
      "contractor_reviews"
    )
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
      updated_at
    `)
    .eq(
      "project_id",
      projectId
    )
    .eq(
      "customer_id",
      user.id
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Ошибка загрузки отзыва:",
      error
    );

    throw new Error(
      "Не удалось загрузить отзыв"
    );
  }

  return review;
}