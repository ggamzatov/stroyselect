import { createClient } from
  "@/lib/supabase/server";

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

export async function getContractorCatalogOptions(): Promise<ContractorCatalogOptions> {
  const supabase =
    await createClient();

  const [
    categoriesResult,
    citiesResult,
  ] = await Promise.all([
    supabase
      .from(
        "service_categories"
      )
      .select(`
        id,
        name
      `)
      .order(
        "name",
        {
          ascending: true,
        }
      ),

    supabase
      .from(
        "contractor_service_areas"
      )
      .select(`
        city
      `)
      .not(
        "city",
        "is",
        null
      ),
  ]);

  if (
    categoriesResult.error
  ) {
    console.error(
      "Ошибка загрузки специализаций каталога:",
      categoriesResult.error
    );

    throw new Error(
      "Не удалось загрузить специализации"
    );
  }

  if (citiesResult.error) {
    console.error(
      "Ошибка загрузки городов каталога:",
      citiesResult.error
    );

    throw new Error(
      "Не удалось загрузить города"
    );
  }

  const categories =
    (
      categoriesResult.data ??
      []
    )
      .filter(
        (category) =>
          Boolean(
            category.id &&
            category.name
          )
      )
      .map(
        (category) => ({
          id:
            String(
              category.id
            ),

          name:
            category.name,
        })
      );

  const uniqueCities =
    Array.from(
      new Set(
        (
          citiesResult.data ??
          []
        )
          .map(
            (item) =>
              item.city
                ?.trim()
          )
          .filter(
            (
              city
            ): city is string =>
              Boolean(city)
          )
      )
    )
      .sort(
        (
          first,
          second
        ) =>
          first.localeCompare(
            second,
            "ru"
          )
      );

  const cities =
    uniqueCities.map(
      (city) => ({
        value:
          city,

        label:
          city,
      })
    );

  return {
    categories,
    cities,
  };
}