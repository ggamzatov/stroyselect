import {
  BriefcaseBusiness,
  MapPin,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { getAdminCatalog } from "@/features/admin/catalog/queries/get-admin-catalog";
import {
  addContractorCity,
  addServiceCategory,
  setContractorCityActive,
  setServiceCategoryActive,
} from "@/features/admin/catalog/actions/manage-catalog";

export default async function AdminCatalogPage() {
  const { categories, cities } = await getAdminCatalog();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <p className="text-sm font-semibold text-primary">Справочники платформы</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">
          Специальности и города
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Эти значения сразу появляются в профиле подрядчика. Скрытые элементы остаются в старых профилях, но больше не предлагаются для нового выбора.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <CatalogSection
          title="Специальности"
          description="Добавляйте направления работ, которые подрядчики смогут выбрать в профиле."
          icon={<BriefcaseBusiness className="h-5 w-5" />}
        >
          <form action={addServiceCategory} className="flex gap-2">
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              placeholder="Например, Монтаж кровли"
              className="stroy-input flex-1"
            />
            <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Добавить
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">ID {category.id}</p>
                </div>
                <form action={setServiceCategoryActive}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="active" value={String(!category.is_active)} />
                  <button
                    title={category.is_active ? "Скрыть" : "Включить"}
                    className={category.is_active ? "text-emerald-600" : "text-muted-foreground"}
                  >
                    {category.is_active ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </CatalogSection>

        <CatalogSection
          title="Города"
          description="Управляйте географией, доступной подрядчикам для выбора."
          icon={<MapPin className="h-5 w-5" />}
        >
          <form action={addContractorCity} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              placeholder="Город"
              className="stroy-input"
            />
            <input
              name="region"
              maxLength={160}
              placeholder="Регион"
              className="stroy-input"
            />
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Добавить
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {cities.map((city) => (
              <div key={city.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{city.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{city.region || "Регион не указан"}</p>
                </div>
                <form action={setContractorCityActive}>
                  <input type="hidden" name="id" value={city.id} />
                  <input type="hidden" name="active" value={String(!city.is_active)} />
                  <button
                    title={city.is_active ? "Скрыть" : "Включить"}
                    className={city.is_active ? "text-emerald-600" : "text-muted-foreground"}
                  >
                    {city.is_active ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </CatalogSection>
      </div>
    </div>
  );
}

function CatalogSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">{icon}</div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
