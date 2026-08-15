import Link from "next/link";

import { ArrowRight, Ban, FolderKanban, Search } from "lucide-react";

import { db } from "@/lib/db/pool";

type Props = {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
};

type ProjectRow = {
  id: string;
  title: string;
  city: string | null;
  status: string;
  is_admin_blocked: boolean;
  created_at: Date | string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  contractor_name: string | null;
};

export default async function AdminProjectsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status?.trim() ?? "";
  const search = params.search?.trim() ?? "";

  const values: unknown[] = [];
  const conditions: string[] = [];

  if (status && status !== "all") {
    values.push(status);
    conditions.push(`p.status::text = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      p.title ILIKE $${values.length}
      OR p.city ILIKE $${values.length}
      OR customer.first_name ILIKE $${values.length}
      OR customer.last_name ILIKE $${values.length}
    )`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [projectsResult, countsResult] = await Promise.all([
    db.query<ProjectRow>(
      `
        SELECT
          p.id,
          p.title,
          p.city,
          p.status::text AS status,
          p.is_admin_blocked,
          p.created_at,
          customer.first_name AS customer_first_name,
          customer.last_name AS customer_last_name,
          contractor.public_name AS contractor_name
        FROM public.projects p
        LEFT JOIN public.profiles customer ON customer.id = p.customer_id
        LEFT JOIN public.contractor_companies contractor ON contractor.id = p.selected_contractor_id
        ${where}
        ORDER BY p.created_at DESC
        LIMIT 200
      `,
      values
    ),
    db.query<{
      total: string | number;
      published: string | number;
      active: string | number;
      blocked: string | number;
    }>(
      `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status::text IN ('published', 'collecting_bids')) AS published,
          COUNT(*) FILTER (WHERE status::text IN ('contractor_selected', 'in_progress')) AS active,
          COUNT(*) FILTER (WHERE is_admin_blocked = true) AS blocked
        FROM public.projects
      `
    ),
  ]);

  const counts = countsResult.rows[0];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <p className="text-sm font-semibold text-primary">Модерация проектов</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground">Проекты платформы</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Всего: {Number(counts?.total ?? 0)} · опубликовано: {Number(counts?.published ?? 0)} · в работе: {Number(counts?.active ?? 0)} · заблокировано: {Number(counts?.blocked ?? 0)}
        </p>
      </section>

      <form className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-card p-4 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Название, город или заказчик"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm"
          />
        </label>
        <select name="status" defaultValue={status || "all"} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
          <option value="all">Все статусы</option>
          <option value="draft">Черновики</option>
          <option value="published">Опубликованные</option>
          <option value="collecting_bids">Сбор предложений</option>
          <option value="contractor_selected">Подрядчик выбран</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Завершённые</option>
          <option value="disputed">Спорные</option>
        </select>
        <button className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Найти</button>
      </form>

      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)]">
        {projectsResult.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Проекты не найдены.</div>
        ) : (
          <div className="divide-y divide-border">
            {projectsResult.rows.map((project) => {
              const customerName = [project.customer_first_name, project.customer_last_name].filter(Boolean).join(" ") || "Заказчик";
              return (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="group flex items-center gap-4 p-5 transition hover:bg-secondary/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    {project.is_admin_blocked ? <Ban className="h-5 w-5" /> : <FolderKanban className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">{project.title}</span>
                      {project.is_admin_blocked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Заблокирован</span>}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {customerName}{project.city ? ` · ${project.city}` : ""} · {formatStatus(project.status)}
                      {project.contractor_name ? ` · ${project.contractor_name}` : ""}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    draft: "Черновик",
    published: "Опубликован",
    collecting_bids: "Сбор предложений",
    contractor_selected: "Подрядчик выбран",
    in_progress: "В работе",
    completed: "Завершён",
    disputed: "Спор",
    cancelled: "Отменён",
  };
  return labels[status] ?? status;
}
