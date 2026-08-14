import "server-only";

import { db } from
  "@/lib/db/pool";

export type ContractorCatalogCategoryOption = {
  id: string;
  name: string;
};

export type ContractorCatalogCityOption = {
  value: string;
  label: string;
};

export type ContractorCatalogOptions = {
  categories:
    ContractorCatalogCategoryOption[];

  cities:
    ContractorCatalogCityOption[];
};

type CategoryRow = {
  id: number;
  name: string;
};

type CityRow = {
  city: string;
};

export async function getContractorCatalogOptions(): Promise<ContractorCatalogOptions> {
  try {
    const [
      categoriesResult,
      citiesResult,
    ] =
      await Promise.all([
        db.query<CategoryRow>(`
          select
            id,
            name
          from public.service_categories
          where is_active = true
          order by name asc
        `),

        db.query<CityRow>(`
          select distinct
            trim(city) as city
          from public.contractor_service_areas
          where city is not null
            and trim(city) <> ''
          order by trim(city) asc
        `),
      ]);

    const categories =
      categoriesResult.rows.map(
        (category) => ({
          id:
            String(
              category.id
            ),

          name:
            category.name,
        })
      );

    const cities =
      citiesResult.rows.map(
        (item) => ({
          value:
            item.city,

          label:
            item.city,
        })
      );

    return {
      categories,
      cities,
    };
  } catch (error) {
    console.error(
      "Ошибка загрузки опций каталога подрядчиков:",
      error
    );

    throw new Error(
      "Не удалось загрузить параметры каталога"
    );
  }
}