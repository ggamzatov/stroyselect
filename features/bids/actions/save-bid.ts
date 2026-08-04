"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

import {
  bidSchema,
  type BidInput,
} from "@/features/bids/schemas/bid-schema";

export type SaveBidResult = {
  success: boolean;
  message: string;
};

export async function saveBid(
  input: BidInput
): Promise<SaveBidResult> {
  const parsed = bidSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Проверьте предложение",
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

  const { data: company, error: companyError } =
    await supabase
      .from("contractor_companies")
      .select(`
        id,
        verification_status,
        accepts_new_projects
      `)
      .eq("owner_id", user.id)
      .maybeSingle();

  if (
    companyError ||
    !company ||
    company.verification_status !==
      "verified"
  ) {
    return {
      success: false,
      message:
        "Отправлять предложения может только подтверждённый подрядчик",
    };
  }

  const values = parsed.data;

  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", values.projectId)
    .in("status", [
      "published",
      "collecting_bids",
    ])
    .maybeSingle();

  if (!project) {
    return {
      success: false,
      message:
        "Проект недоступен для предложений",
    };
  }

  const { data: existingBid } =
    await supabase
      .from("project_bids")
      .select("id, status")
      .eq("project_id", values.projectId)
      .eq("contractor_id", company.id)
      .maybeSingle();

  const payload = {
    project_id: values.projectId,
    contractor_id: company.id,
    price: values.price,
    duration_days: values.durationDays,
    message: values.message,
    proposed_start_date:
      values.proposedStartDate || null,
    updated_at: new Date().toISOString(),
  };

  if (existingBid) {
    if (
      ![
        "submitted",
        "viewed",
        "shortlisted",
      ].includes(existingBid.status)
    ) {
      return {
        success: false,
        message:
          "Это предложение уже нельзя редактировать",
      };
    }

    const { error } = await supabase
      .from("project_bids")
      .update(payload)
      .eq("id", existingBid.id)
      .eq("contractor_id", company.id);

    if (error) {
      console.error(
        "Ошибка обновления предложения:",
        error
      );

      return {
        success: false,
        message:
          "Не удалось обновить предложение",
      };
    }

    revalidatePath(
      `/contractor/projects/${values.projectId}`
    );

    return {
      success: true,
      message: "Предложение обновлено",
    };
  }

  const { error } = await supabase
    .from("project_bids")
    .insert({
      ...payload,
      status: "submitted",
    });

  if (error) {
    console.error(
      "Ошибка создания предложения:",
      error
    );

    return {
      success: false,
      message:
        "Не удалось отправить предложение",
    };
  }

  revalidatePath("/contractor/projects");
  revalidatePath(
    `/contractor/projects/${values.projectId}`
  );
  revalidatePath(
    `/customer/projects/${values.projectId}`
  );

  return {
    success: true,
    message:
      "Предложение отправлено заказчику",
  };
}