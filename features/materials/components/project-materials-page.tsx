import {
  BadgeCheck,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  PackageSearch,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getMaterialProjectParticipant } from "@/lib/materials/get-material-project-participant";
import {
  addMaterialItem,
  createMaterialList,
  removeMaterialItem,
  requestMaterialTender,
  selectMaterialQuote,
} from "@/features/materials/actions/project-materials";

type Role = "customer" | "contractor";
type ListRow = {
  id: string;
  title: string;
  status: string;
  selected_quote_id: string | null;
  created_at: Date | string;
};
type ItemRow = {
  id: string;
  product_id: string | null;
  description: string;
  quantity: string | number;
  unit: string;
};
type ProductRow = {
  id: string;
  canonical_name: string;
  brand: string | null;
  model: string | null;
  unit: string;
};
type RequestRow = {
  id: string;
  status: string;
  requested_at: Date | string;
  closes_at: Date | string | null;
};
type QuoteRow = {
  id: string;
  supplier_id: string;
  public_name: string;
  status: string;
  goods_subtotal_minor: string | number;
  delivery_minor: string | number | null;
  missing_item_count: number;
  max_lead_time_days: number;
  valid_until: Date | string | null;
};

type Props = {
  projectId: string;
  role: Role;
  query: Record<string, string | string[] | undefined>;
};

export async function ProjectMaterialsPage({ projectId, role, query }: Props) {
  const activeUser = await requireActiveUser();
  if (!activeUser.success) redirect("/login");
  if (activeUser.profile.role !== role) redirect("/dashboard");

  const ctx = await getMaterialProjectParticipant(
    projectId,
    activeUser.user.id,
    activeUser.profile.role
  );
  if (!ctx.success) redirect(`/${role}/work/${projectId}`);

  const listResult = await db.query<ListRow>(
    `SELECT id,title,status,selected_quote_id,created_at FROM public.project_material_lists WHERE project_id=$1::uuid ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  );
  const list = listResult.rows[0] ?? null;

  const [itemsResult, productsResult, requestResult] = await Promise.all([
    list
      ? db.query<ItemRow>(
          `SELECT id,product_id,description,quantity,unit FROM public.project_material_items WHERE list_id=$1::uuid ORDER BY sort_order,created_at`,
          [list.id]
        )
      : Promise.resolve({ rows: [] } as { rows: ItemRow[] }),
    db.query<ProductRow>(
      `SELECT id,canonical_name,brand,model,unit FROM public.material_products WHERE is_active=true ORDER BY canonical_name LIMIT 1000`
    ),
    list
      ? db.query<RequestRow>(
          `SELECT id,status,requested_at,closes_at FROM public.material_procurement_requests WHERE list_id=$1::uuid ORDER BY requested_at DESC LIMIT 1`,
          [list.id]
        )
      : Promise.resolve({ rows: [] } as { rows: RequestRow[] }),
  ]);

  const request = requestResult.rows[0] ?? null;
  const quotesResult = request
    ? await db.query<QuoteRow>(
        `SELECT q.id,q.supplier_id,s.public_name,q.status,q.goods_subtotal_minor,q.delivery_minor,q.missing_item_count,q.max_lead_time_days,q.valid_until FROM public.material_procurement_quotes q JOIN public.material_suppliers s ON s.id=q.supplier_id WHERE q.request_id=$1::uuid ORDER BY q.missing_item_count ASC,(q.goods_subtotal_minor+COALESCE(q.delivery_minor,0)) ASC,s.public_name`,
        [request.id]
      )
    : { rows: [] as QuoteRow[] };

  const notice = query.created
    ? "Ведомость создана"
    : query.item
      ? "Позиция добавлена"
      : query.removed
        ? "Позиция удалена"
        : query.tender
          ? "Тендер сформирован по актуальным прайсам поставщиков"
          : query.selected
            ? "Поставщик выбран. Можно перейти к оформлению заказа и доставки."
            : query.error
              ? errorMessage(String(query.error))
              : null;

  const editable =
    ctx.project.status === "contractor_selected" || ctx.project.status === "in_progress";

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px] space-y-5">
        <section className="ui-v2-panel overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Закупки объекта</p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
                    Материалы
                  </h1>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                Сформируйте ведомость, сравните одинаковые позиции у подключённых поставщиков и зафиксируйте выбранную цену до оформления заказа.
              </p>
            </div>

            <ProcurementSteps status={list?.status ?? "empty"} />
          </div>
        </section>

        {notice ? (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-secondary/70 px-4 py-3 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            {notice}
          </div>
        ) : null}

        {!list ? (
          <section className="ui-v2-panel p-5 sm:p-6 lg:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                  Создать ведомость материалов
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Соберите материалы одного блока работ: например, «Система отопления», «Черновая электрика» или «Материалы для санузла».
                </p>
              </div>

              {editable ? (
                <form action={createMaterialList} className="rounded-2xl border border-border bg-background/70 p-4">
                  <input type="hidden" name="projectId" value={projectId} />
                  <label className="block text-xs font-bold text-foreground">
                    Название ведомости
                    <input
                      name="title"
                      required
                      maxLength={240}
                      placeholder="Например, система отопления"
                      className="stroy-input mt-2"
                    />
                  </label>
                  <button className="mt-3 min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-[#076c47]">
                    Создать ведомость
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl bg-muted px-4 py-4 text-sm font-semibold text-muted-foreground">
                  Проект завершён: создание новых закупок недоступно.
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="ui-v2-panel p-4 sm:p-5 lg:p-6" aria-labelledby="materials-list-title">
              <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Ведомость</p>
                  <h2 id="materials-list-title" className="mt-1 text-xl font-black text-foreground sm:text-2xl">
                    {list.title}
                  </h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {listStatus(list.status)} · создана {date(list.created_at)}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                  {itemsResult.rows.length} позиций
                </span>
              </div>

              <div className="mt-2 divide-y divide-border">
                {itemsResult.rows.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-black text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="break-words font-bold text-foreground">{item.description}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {number(item.quantity)} {item.unit}
                          {item.product_id ? " · сопоставлено с каталогом" : " · требует сопоставления"}
                        </p>
                      </div>
                    </div>

                    {list.status === "draft" && editable ? (
                      <form action={removeMaterialItem} className="shrink-0">
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="listId" value={list.id} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <button className="min-h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:border-red-200 hover:text-red-600">
                          Удалить
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}

                {itemsResult.rows.length === 0 ? (
                  <div className="py-10 text-center">
                    <PackageSearch className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-muted-foreground">Добавьте первую позицию.</p>
                  </div>
                ) : null}
              </div>
            </section>

            {list.status === "draft" && editable ? (
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
                <div className="ui-v2-panel p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                      <PackageSearch className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-black text-foreground">Добавить материал</h2>
                      <p className="text-xs text-muted-foreground">Выберите товар из каталога или опишите вручную</p>
                    </div>
                  </div>

                  <form action={addMaterialItem} className="mt-5 grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="listId" value={list.id} />

                    <label className="block text-xs font-bold text-foreground sm:col-span-2">
                      Товар из каталога
                      <select name="productId" className="stroy-input mt-2">
                        <option value="">Нет в каталоге — добавить вручную</option>
                        {productsResult.rows.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.canonical_name}{product.brand ? ` · ${product.brand}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-bold text-foreground sm:col-span-2">
                      Описание
                      <input
                        name="description"
                        placeholder="Описание, если товара нет в каталоге"
                        maxLength={500}
                        className="stroy-input mt-2"
                      />
                    </label>

                    <label className="block text-xs font-bold text-foreground">
                      Количество
                      <input
                        name="quantity"
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        placeholder="1"
                        className="stroy-input mt-2"
                      />
                    </label>

                    <label className="block text-xs font-bold text-foreground">
                      Единица измерения
                      <input
                        name="unit"
                        defaultValue="шт"
                        maxLength={40}
                        placeholder="шт"
                        className="stroy-input mt-2"
                      />
                    </label>

                    <button className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-[#076c47] sm:col-span-2">
                      Добавить в ведомость
                    </button>
                  </form>
                </div>

                <aside className="ui-v2-panel p-5 sm:p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Boxes className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-lg font-black text-foreground">Сравнить поставщиков</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Тендер зафиксирует текущие цены и остатки активных поставщиков. После запуска состав ведомости уже не меняется.
                  </p>
                  <form action={requestMaterialTender} className="mt-5">
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="listId" value={list.id} />
                    <button
                      disabled={itemsResult.rows.length === 0}
                      className="min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-[#076c47] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Получить предложения поставщиков
                    </button>
                  </form>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Неполные предложения будут показаны, но выбрать их победителем нельзя.
                  </p>
                </aside>
              </section>
            ) : null}

            {list.status === "requested" || list.status === "selected" ? (
              <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="supplier-comparison-title">
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
                      <p className="text-xs font-bold uppercase tracking-[0.12em]">Тендер</p>
                    </div>
                    <h2 id="supplier-comparison-title" className="mt-2 text-xl font-black text-foreground sm:text-2xl">
                      Сравнение поставщиков
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Цена и наличие зафиксированы{request ? ` ${dateTime(request.requested_at)}` : ""}. Доставка рассчитывается отдельно.
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                    {quotesResult.rows.length} предложений
                  </span>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {quotesResult.rows.map((quote, index) => {
                    const complete = quote.missing_item_count === 0;
                    const selected = list.selected_quote_id === quote.id;

                    return (
                      <article
                        key={quote.id}
                        className={[
                          "rounded-2xl border p-5 transition",
                          selected
                            ? "border-primary bg-secondary/45 shadow-[var(--shadow-soft)]"
                            : "border-border bg-background/60 hover:border-primary/20",
                        ].join(" ")}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-foreground">{quote.public_name}</h3>
                              {index === 0 && complete ? (
                                <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                                  Лучшая полная цена
                                </span>
                              ) : null}
                              {selected ? <BadgeCheck className="h-5 w-5 text-primary" aria-label="Поставщик выбран" /> : null}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              Покрытие: {Math.max(0, itemsResult.rows.length - quote.missing_item_count)} из {itemsResult.rows.length} позиций · срок до {quote.max_lead_time_days} дн.
                            </p>
                          </div>
                          <p className="shrink-0 text-2xl font-black tracking-[-0.03em] text-foreground">
                            {money(quote.goods_subtotal_minor)}
                          </p>
                        </div>

                        {!complete ? (
                          <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                            Не хватает позиций: {quote.missing_item_count}. Такое предложение нельзя выбрать победителем.
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Truck className="h-4 w-4" aria-hidden="true" />
                            Доставка будет рассчитана отдельно
                          </div>
                          {list.status === "requested" && editable && complete ? (
                            <form action={selectMaterialQuote}>
                              <input type="hidden" name="projectId" value={projectId} />
                              <input type="hidden" name="listId" value={list.id} />
                              <input type="hidden" name="quoteId" value={quote.id} />
                              <button className="min-h-10 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:bg-[#076c47]">
                                Выбрать поставщика
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}

                  {quotesResult.rows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-10 text-center text-sm text-muted-foreground xl:col-span-2">
                      Поставщики пока не дали сравнимых предложений.
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {list.status === "selected" ? (
              <section className="rounded-2xl border border-primary/20 bg-secondary/60 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-foreground">Поставщик выбран</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Выбранное предложение зафиксировано. Ниже можно оформить заказ, оплатить товары и рассчитать доставку до объекта.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function ProcurementSteps({ status }: { status: string }) {
  const steps = [
    { label: "Ведомость", done: status !== "empty", active: status === "draft" },
    {
      label: "Сравнение",
      done: ["requested", "selected", "ordered", "completed"].includes(status),
      active: status === "requested",
    },
    {
      label: "Поставщик",
      done: ["selected", "ordered", "completed"].includes(status),
      active: ["selected", "ordered"].includes(status),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]" aria-label="Этапы закупки">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={[
            "rounded-2xl border p-3 text-center",
            step.done || step.active
              ? "border-primary/15 bg-secondary/70"
              : "border-border bg-background/70",
          ].join(" ")}
        >
          <span
            className={[
              "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
              step.done
                ? "bg-primary text-primary-foreground"
                : step.active
                  ? "border border-primary bg-card text-primary"
                  : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {step.done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
          </span>
          <p className="mt-2 text-[10px] font-bold text-foreground">{step.label}</p>
        </div>
      ))}
    </div>
  );
}

function money(value: string | number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value) / 100);
}

function number(value: string | number) {
  return Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

function date(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function listStatus(value: string) {
  if (value === "draft") return "Черновик";
  if (value === "requested") return "Сравнение поставщиков";
  if (value === "selected") return "Поставщик выбран";
  if (value === "ordered") return "Заказано";
  if (value === "completed") return "Завершено";
  if (value === "cancelled") return "Отменено";
  return value;
}

function errorMessage(code: string) {
  const messages: Record<string, string> = {
    list: "Проверьте название ведомости.",
    "active-list": "Сначала завершите текущую ведомость.",
    item: "Проверьте позицию и количество.",
    product: "Материал не найден в каталоге.",
    "list-state": "Эту ведомость уже нельзя изменять.",
    empty: "Ведомость пуста.",
    "no-suppliers": "Пока нет активных поставщиков для сравнения.",
    tender: "Не удалось сформировать тендер.",
    quote: "Не удалось выбрать это предложение.",
    status: "На текущем статусе проекта новая закупка недоступна.",
  };
  return messages[code] ?? "Операция не выполнена.";
}
