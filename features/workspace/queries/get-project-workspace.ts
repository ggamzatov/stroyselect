import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from
  "@/lib/supabase/server";

export async function getProjectWorkspace(
  projectId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select(`
        id,
        role,
        first_name,
        last_name,
        phone,
        is_blocked
      `)
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.is_blocked
  ) {
    redirect("/login");
  }

  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select(`
        id,
        customer_id,
        selected_contractor_id,
        selected_bid_id,
        title,
        description,
        property_type,
        region,
        city,
        address,
        budget_min,
        budget_max,
        desired_start_date,
        desired_end_date,
        status,
        contractor_selected_at,
        work_started_at,
        completed_at,
        created_at,
        updated_at
      `)
      .eq("id", projectId)
      .maybeSingle();

  if (projectError) {
    console.error(
      "Ошибка загрузки рабочего проекта:",
      projectError
    );

    throw new Error(
      "Не удалось загрузить рабочий проект"
    );
  }

  if (!project) {
    notFound();
  }

  const [
    customerResult,
    contractorResult,
    selectedBidResult,
    stagesResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        phone,
        city
      `)
      .eq("id", project.customer_id)
      .maybeSingle(),

    project.selected_contractor_id
      ? supabase
          .from("contractor_companies")
          .select(`
            id,
            public_name,
            legal_name,
            contact_phone,
            contact_email,
            rating,
            rating_count,
            verification_status
          `)
          .eq(
            "id",
            project.selected_contractor_id
          )
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    project.selected_bid_id
      ? supabase
          .from("project_bids")
          .select(`
            id,
            price,
            duration_days,
            message,
            proposed_start_date,
            status
          `)
          .eq("id", project.selected_bid_id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    supabase
      .from("project_stages")
      .select(`
        id,
        project_id,
        title,
        description,
        price,
        progress_weight,
        sort_order,
        status,
        planned_start_date,
        planned_end_date,
        actual_started_at,
        actual_completed_at,
        created_at,
       updated_at
      `)
      .eq("project_id", projectId)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("project_events")
      .select(`
        id,
        project_id,
        author_id,
        event_type,
        title,
        description,
        metadata,
        created_at
      `)
      .eq("project_id", projectId)
      .order("created_at", {
        ascending: false,
      })
      .limit(50),
  ]);

  if (stagesResult.error) {
    console.error(
      "Ошибка загрузки этапов:",
      stagesResult.error
    );

    throw new Error(
      "Не удалось загрузить этапы проекта"
    );
  }

  if (eventsResult.error) {
    console.error(
      "Ошибка загрузки событий:",
      eventsResult.error
    );

    throw new Error(
      "Не удалось загрузить журнал проекта"
    );
  }

  return {
    currentUser: {
      id: user.id,
      role: profile.role,
    },

    project,

    customer:
      customerResult.data ?? null,

    contractor:
      contractorResult.data ?? null,

    selectedBid:
      selectedBidResult.data ?? null,

    stages:
      stagesResult.data ?? [],

    events:
      eventsResult.data ?? [],
  };
}