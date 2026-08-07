"use client";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useState,
} from "react";

import {
  Filter,
  Search,
  X,
} from "lucide-react";

type Values = {
  search: string;
  city: string;
  categoryId: string;
  minRating: string;
  minBudget: string;
  maxBudget: string;
  acceptsProjectsOnly: boolean;
  hasPortfolio: boolean;
  sort: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

type CityOption = {
  value: string;
  label: string;
};

type Props = {
  values: Values;

  categories:
    CategoryOption[];

  cities:
    CityOption[];
};

export function ContractorCatalogFilters({
  values,
  categories,
  cities,
}: Props) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    form,
    setForm,
  ] =
    useState(values);

  function updateField<
    K extends keyof Values
  >(
    key: K,
    value: Values[K]
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,
        [key]:
          value,
      })
    );
  }

  function applyFilters() {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    setOrDelete(
      params,
      "search",
      form.search.trim()
    );

    setOrDelete(
      params,
      "city",
      form.city
    );

    setOrDelete(
      params,
      "categoryId",
      form.categoryId
    );

    setOrDelete(
      params,
      "minRating",
      form.minRating
    );

    setOrDelete(
      params,
      "minBudget",
      form.minBudget
    );

    setOrDelete(
      params,
      "maxBudget",
      form.maxBudget
    );

    setBoolean(
      params,
      "acceptsProjectsOnly",
      form.acceptsProjectsOnly
    );

    setBoolean(
      params,
      "hasPortfolio",
      form.hasPortfolio
    );

    setOrDelete(
      params,
      "sort",
      form.sort
    );

    params.delete(
      "page"
    );

    const query =
      params.toString();

    router.push(
      query
        ? `/customer/contractors?${query}`
        : "/customer/contractors"
    );
  }

  function resetFilters() {
    setForm({
      search: "",
      city: "",
      categoryId: "",
      minRating: "",
      minBudget: "",
      maxBudget: "",
      acceptsProjectsOnly:
        false,
      hasPortfolio:
        false,
      sort:
        "recommended",
    });

    router.push(
      "/customer/contractors"
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Filter className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-bold text-foreground">
            Фильтры
          </h2>

          <p className="text-xs text-muted-foreground">
            Настройте параметры
            поиска исполнителя
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <label className="text-xs font-semibold text-muted-foreground">
            Название компании
          </label>

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={
                form.search
              }
              onChange={(
                event
              ) =>
                updateField(
                  "search",
                  event.target
                    .value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  applyFilters();
                }
              }}
              placeholder="Например, Строй Дом"
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Город
          </label>

          <select
            value={
              form.city
            }
            onChange={(
              event
            ) =>
              updateField(
                "city",
                event.target
                  .value
              )
            }
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="">
              Все города
            </option>

            {cities.map(
              (city) => (
                <option
                  key={
                    city.value
                  }
                  value={
                    city.value
                  }
                >
                  {city.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="text-xs font-semibold text-muted-foreground">
            Специализация
          </label>

          <select
            value={
              form.categoryId
            }
            onChange={(
              event
            ) =>
              updateField(
                "categoryId",
                event.target
                  .value
              )
            }
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="">
              Все специализации
            </option>

            {categories.map(
              (
                category
              ) => (
                <option
                  key={
                    category.id
                  }
                  value={
                    category.id
                  }
                >
                  {
                    category.name
                  }
                </option>
              )
            )}
          </select>
        </div>

        <div className="lg:col-span-1">
          <label className="text-xs font-semibold text-muted-foreground">
            Рейтинг
          </label>

          <select
            value={
              form.minRating
            }
            onChange={(
              event
            ) =>
              updateField(
                "minRating",
                event.target
                  .value
              )
            }
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="">
              Любой
            </option>

            <option value="4.5">
              4.5+
            </option>

            <option value="4">
              4+
            </option>

            <option value="3">
              3+
            </option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Сортировка
          </label>

          <select
            value={
              form.sort
            }
            onChange={(
              event
            ) =>
              updateField(
                "sort",
                event.target
                  .value
              )
            }
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="recommended">
              Рекомендуемые
            </option>

            <option value="rating">
              По рейтингу
            </option>

            <option value="reviews">
              По отзывам
            </option>

            <option value="completed">
              По проектам
            </option>

            <option value="newest">
              Новые
            </option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Бюджет от
          </label>

          <input
            type="number"
            min="0"
            value={
              form.minBudget
            }
            onChange={(
              event
            ) =>
              updateField(
                "minBudget",
                event.target
                  .value
              )
            }
            placeholder="100 000"
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Бюджет до
          </label>

          <input
            type="number"
            min="0"
            value={
              form.maxBudget
            }
            onChange={(
              event
            ) =>
              updateField(
                "maxBudget",
                event.target
                  .value
              )
            }
            placeholder="5 000 000"
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="flex flex-col justify-end gap-3 lg:col-span-4">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
            <input
              type="checkbox"
              checked={
                form.acceptsProjectsOnly
              }
              onChange={(
                event
              ) =>
                updateField(
                  "acceptsProjectsOnly",
                  event.target
                    .checked
                )
              }
              className="h-4 w-4 accent-primary"
            />

            <span className="text-sm font-medium text-foreground">
              Принимают новые проекты
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
            <input
              type="checkbox"
              checked={
                form.hasPortfolio
              }
              onChange={(
                event
              ) =>
                updateField(
                  "hasPortfolio",
                  event.target
                    .checked
                )
              }
              className="h-4 w-4 accent-primary"
            />

            <span className="text-sm font-medium text-foreground">
              Есть портфолио
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={
            applyFilters
          }
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Search className="h-4 w-4" />

          Найти подрядчиков
        </button>

        <button
          type="button"
          onClick={
            resetFilters
          }
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
        >
          <X className="h-4 w-4" />

          Сбросить
        </button>
      </div>
    </section>
  );
}

function setOrDelete(
  params:
    URLSearchParams,
  key: string,
  value: string
) {
  if (value) {
    params.set(
      key,
      value
    );
  } else {
    params.delete(
      key
    );
  }
}

function setBoolean(
  params:
    URLSearchParams,
  key: string,
  value: boolean
) {
  if (value) {
    params.set(
      key,
      "true"
    );
  } else {
    params.delete(
      key
    );
  }
}