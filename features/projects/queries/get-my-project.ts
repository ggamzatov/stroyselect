import "server-only";

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";

type PropertyType =
  | "apartment"
  | "private_house"
  | "commercial"
  | "land"
  | "industrial"
  | "other";

type ProjectRow = {
  id: string;
  customer_id: string;
  category_id: number | string;
  title: string;
  description: string | null;
  property_type: PropertyType | null;
  work_type: string | null;
  scope_details: string | null;
  current_condition: string | null;
  finish_level: string | null;
  dimensions: string | null;
  material_preferences: string | null;
  permit_readiness: string | null;
  design_readiness: string | null;
  travel_constraints: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  budget_min: string | number | null;
  budget_max: string | number | null;
  desired_start_date: Date | string | null;
  desired_end_date: Date | string | null;
  status: string;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  category_name: string | null;
  category_slug: string | null;
};

export async function getMyProject(projectId: string) {
  const userId = await getCurrentSessionUserId();
  if (!userId) redirect("/login");

  try {
    const result = await db.query<ProjectRow>(`
      SELECT
        p.id, p.customer_id, p.category_id, p.title, p.description,
        p.property_type, p.work_type, p.scope_details, p.current_condition,
        p.finish_level, p.dimensions, p.material_preferences,
        p.permit_readiness, p.design_readiness, p.travel_constraints,
        p.region, p.city, p.address, p.latitude, p.longitude,
        p.budget_min, p.budget_max, p.desired_start_date, p.desired_end_date,
        p.status, p.published_at, p.created_at, p.updated_at,
        sc.name AS category_name, sc.slug AS category_slug
      FROM public.projects p
      LEFT JOIN public.service_categories sc ON sc.id = p.category_id
      WHERE p.id = $1 AND p.customer_id = $2
      LIMIT 1
    `, [projectId, userId]);

    const row = result.rows[0];
    if (!row) notFound();

    return {
      id: row.id,
      customer_id: row.customer_id,
      category_id: Number(row.category_id),
      title: row.title,
      description: row.description ?? "",
      property_type: row.property_type,
      work_type: row.work_type ?? "",
      scope_details: row.scope_details ?? "",
      current_condition: row.current_condition ?? "",
      finish_level: row.finish_level ?? "",
      dimensions: row.dimensions ?? "",
      material_preferences: row.material_preferences ?? "",
      permit_readiness: row.permit_readiness ?? "",
      design_readiness: row.design_readiness ?? "",
      travel_constraints: row.travel_constraints ?? "",
      region: row.region ?? "",
      city: row.city ?? "",
      address: row.address ?? "",
      latitude: toNullableNumber(row.latitude),
      longitude: toNullableNumber(row.longitude),
      budget_min: toNullableNumber(row.budget_min),
      budget_max: toNullableNumber(row.budget_max),
      desired_start_date: toNullableDateString(row.desired_start_date),
      desired_end_date: toNullableDateString(row.desired_end_date),
      status: row.status,
      published_at: row.published_at ? toIsoString(row.published_at) : null,
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
      service_categories: row.category_name
        ? { id: Number(row.category_id), name: row.category_name, slug: row.category_slug }
        : null,
    };
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    console.error("Ошибка загрузки проекта:", error);
    throw new Error("Не удалось загрузить проект");
  }
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNullableDateString(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function isNextNavigationError(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string";
}
