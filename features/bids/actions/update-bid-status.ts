"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import {
  customerBidDecisionSchema,
  type CustomerBidDecisionInput,
} from "@/features/bids/schemas/customer-bid-decision-schema";

export type UpdateBidStatusResult = {
  success: boolean;
  message: string;
};

export async function updateBidStatus(
  input: CustomerBidDecisionInput
): Promise<UpdateBidStatusResult> {
  const parsed =
    customerBidDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Некорректное решение",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Необходимо войти",
    };
  }

  const { bidId, decision } = parsed.data;

  const { data: bid, error: bidError } =
    await supabase
      .from("project_bids")
      .select(`
        id,
        project_id,
        contractor_id,
        status,
        projects!project_bids_project_id_fkey!inner (...) (
          id,
          customer_id,
          status
        )
      `)
      .eq("id", bidId)
      .eq("projects.customer_id", user.id)
      .maybeSingle();

  if (bidError || !bid) {
    return {
      success: false,
      message:
        "Предложение не найдено или недоступно",
    };
  }

  if (
    ![
      "submitted",
      "viewed",
      "shortlisted",
    ].includes(bid.status)
  ) {
    return {
      success: false,
      message:
        "Статус этого предложения уже нельзя изменить",
    };
  }

  if (decision === "accepted") {
  const now = new Date().toISOString();

  const { data: currentProject, error: projectCheckError } =
    await supabase
      .from("projects")
      .select(`
        id,
        status,
        selected_contractor_id,
        selected_bid_id
      `)
      .eq("id", bid.project_id)
      .eq("customer_id", user.id)
      .maybeSingle();

  if (projectCheckError || !currentProject) {
    return {
      success: false,
      message: "Проект не найден",
    };
  }

  if (currentProject.selected_contractor_id) {
    return {
      success: false,
      message:
        "По этому проекту уже выбран подрядчик",
    };
  }

  if (
    ![
      "published",
      "collecting_bids",
    ].includes(currentProject.status)
  ) {
    return {
      success: false,
      message:
        "Текущий статус проекта не позволяет выбрать подрядчика",
    };
  }

  const { error: projectError } =
    await supabase
      .from("projects")
      .update({
        status: "contractor_selected",
        selected_contractor_id:
          bid.contractor_id,
        selected_bid_id: bid.id,
        contractor_selected_at: now,
        updated_at: now,
      })
      .eq("id", bid.project_id)
      .eq("customer_id", user.id)
      .is("selected_contractor_id", null);

  if (projectError) {
    console.error(
      "Ошибка назначения подрядчика:",
      projectError
    );

    return {
      success: false,
      message:
        "Не удалось назначить подрядчика",
    };
  }

  const { error: acceptedBidError } =
    await supabase
      .from("project_bids")
      .update({
        status: "accepted",
        updated_at: now,
      })
      .eq("id", bid.id)
      .eq("project_id", bid.project_id);

  if (acceptedBidError) {
    console.error(
      "Ошибка принятия предложения:",
      acceptedBidError
    );

    return {
      success: false,
      message:
        "Подрядчик назначен, но не удалось обновить предложение",
    };
  }

  const { error: rejectOthersError } =
    await supabase
      .from("project_bids")
      .update({
        status: "rejected",
        updated_at: now,
      })
      .eq("project_id", bid.project_id)
      .neq("id", bid.id)
      .in("status", [
        "submitted",
        "viewed",
        "shortlisted",
      ]);

  if (rejectOthersError) {
    console.error(
      "Ошибка отклонения остальных предложений:",
      rejectOthersError
    );
  }

  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/bids");
  revalidatePath(
    `/customer/projects/${bid.project_id}`
  );
  revalidatePath("/contractor/dashboard");
  revalidatePath("/contractor/bids");
  revalidatePath(
    `/contractor/projects/${bid.project_id}`
  );

  return {
    success: true,
    message:
      "Предложение принято. Подрядчик назначен на проект.",
  };
}
const { error: updateError } = await supabase
  .from("project_bids")
  .update({
    status: decision,
    updated_at: new Date().toISOString(),
  })
  .eq("id", bidId);

  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/bids");
  revalidatePath(
    `/customer/projects/${bid.project_id}`
  );
  revalidatePath("/contractor/dashboard");
  revalidatePath("/contractor/bids");
  revalidatePath(
    `/contractor/projects/${bid.project_id}`
  );

  return {
    success: true,
    message:
      getDecisionMessage(decision),
  };
}

function getDecisionMessage(
  decision:
    | "viewed"
    | "shortlisted"
    | "accepted"
    | "rejected"
) {
  switch (decision) {
    case "viewed":
      return "Предложение отмечено как просмотренное";

    case "shortlisted":
      return "Подрядчик добавлен в короткий список";

    case "accepted":
      return "Предложение принято";

    case "rejected":
      return "Предложение отклонено";
  }
}