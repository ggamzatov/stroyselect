import "server-only";

import { db } from "@/lib/db/pool";

export type ContractorCityOption = {
  id: string;
  name: string;
  region: string | null;
};

export async function getContractorCities(): Promise<ContractorCityOption[]> {
  const result = await db.query<ContractorCityOption>(`
    SELECT id, name, region
    FROM public.contractor_cities
    WHERE is_active = true
    ORDER BY region NULLS LAST, name ASC
  `);

  return result.rows;
}
