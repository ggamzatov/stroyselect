import "server-only";

import { db } from
  "@/lib/db/pool";

export type ServiceCategoryRow = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

type RawServiceCategoryRow = {
  id: string | number;
  name: string;
  slug: string;
  is_active: boolean;
};

export async function getActiveServiceCategories(): Promise<
  ServiceCategoryRow[]
> {
  const result =
    await db.query<RawServiceCategoryRow>(`
      select
        id,
        name,
        coalesce(slug, '') as slug,
        is_active
      from public.service_categories
      where is_active = true
      order by name asc
    `);

  return result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
  }));
}
