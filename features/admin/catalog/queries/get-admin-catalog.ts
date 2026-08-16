import "server-only";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

type CategoryRow = {
  id: number | string;
  name: string;
  slug: string;
  is_active: boolean;
};

type CityRow = {
  id: string;
  name: string;
  region: string | null;
  is_active: boolean;
  created_at: Date | string;
};

export async function getAdminCatalog() {
  const { profile } = await requireStaffUser();
  if (profile.role !== "admin") {
    throw new Error("Управление справочниками доступно только администратору");
  }

  const [categoriesResult, citiesResult] = await Promise.all([
    db.query<CategoryRow>(`
      SELECT id, name, coalesce(slug, '') AS slug, is_active
      FROM public.service_categories
      ORDER BY is_active DESC, name ASC
    `),
    db.query<CityRow>(`
      SELECT id, name, region, is_active, created_at
      FROM public.contractor_cities
      ORDER BY is_active DESC, region NULLS LAST, name ASC
    `),
  ]);

  return {
    categories: categoriesResult.rows.map((row) => ({
      ...row,
      id: Number(row.id),
    })),
    cities: citiesResult.rows.map((row) => ({
      ...row,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    })),
  };
}
