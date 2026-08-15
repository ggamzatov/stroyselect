import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Building2, CalendarDays, CircleDollarSign, MapPin, UserRound } from "lucide-react";

import { db } from "@/lib/db/pool";
import { ProjectAdminActions } from "@/features/admin/components/project-admin-actions";

type Props = { params: Promise<{ id: string }> };

type ProjectRow = {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  city: string | null;
  region: string | null;
  address: string | null;
  status: string;
  budget_min: number | string | null;
  budget_max: number | string | null;
  desired_start_date: Date | string | null;
  desired_end_date: Date | string | null;
  selected_contractor_id: string | null;
  selected_bid_id: string | null;
  is_admin_blocked: boolean;
  admin_block_reason: string | null;
  admin_blocked_at: Date | string | null;
  published_at: Date | string | null;
  created_at: Date | string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  contractor_name: string | null;
};

export default async function AdminProjectPage({ params }: Props) {
  const { id } = await params;

  const projectResult = await db.query<ProjectRow>(
    `
      SELECT
        p.id,
        p.customer_id,
        p.title,
        p.description,
        p.city,
        p.region,
        p.address,
        p.status::text AS status,
        p.budget_min,
        p.budget_max,
        p.desired_start_date,
        p.desired_end_date,
        p.selected_contractor_id,
        p.selected_bid_id,
        p.is_admin_blocked,
        p.admin_block_reason,
        p.admin_blocked_at,
        p.published_at,
        p.created_at,
        customer.first_name AS customer_first_name,
        customer.last_name AS customer_last_name,
        customer.email AS customer_email,
        contractor.public_name AS contractor_name
      FROM public.projects p
      LEFT JOIN public.profiles customer ON customer.id = p.customer_id
      LEFT JOIN public.contractor_companies contractor ON contractor.id = p.selected_contractor_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [id]
  );

  const project = projectResult.rows[0];
  if (!project) notFound();

  const [bidsResult, stagesResult, eventsResult] = await Promise.all([
    db.query<{
      id: string;
      status: string;
      price: number | string;
      duration_days: number;
      company_name: string | null;
      created_at: Date | string;
    }>(
      `
        SELECT
          b.id,
          b.status::text AS status,
          b.price,
          b.duration_days,
          c.public_name AS company_name,
          b.created_at
        FROM public.project_bids b
        LEFT JOIN public.contractor_companies c ON c.id = b.contractor_id
        WHERE b.project_id = $1
        ORDER BY b.created_at DESC
      `,
      [id]
    ),
    db.query<{ id: string; title: string; status: string; progress_weight: number }>(
      `
        SELECT id, title, status::text AS status, progress_weight
        FROM public.project_stages
        WHERE project_id = $1
        ORDER BY sort_order ASC
      `,
      [id]
    ),
    db.query<{ id: string; title: string; description: string | null; event_type: string; created_at: Date | string }>(
      `
        SELECT id, title, description, event_type::text AS event_type, created_at
        FROM public.project_events
        WHERE project_id = $1
        ORDER BY created_at DESC
        LIMIT 30
      `,
      [id]
    ),
  ]);

  const customerName = [project.customer_first_name, project.customer_last_name].filter(Boolean).join(" ") || project.customer_email || "Заказчик";

  return (
    <div className="space-y-6">
      <Link href="/admin/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> К проектам
      </Link>

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Проект</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground">{project.title}</h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-secondary px-3 py-1 font-semibold">{formatStatus(project.status)}</span>
              {project.city && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{project.city}</span>}
              <span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4" />{customerName}</span>
            </div>
          </div>
          <div className="w-full max-w-md">
            <ProjectAdminActions
              projectId={project.id}
              isBlocked={project.is_admin_blocked}
              blockReason={project.admin_block_reason}
            />
          </div>
        </div>
        {project.description && <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{project.description}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Заказчик" value={customerName} icon={<UserRound className="h-5 w-5" />} />
        <Stat label="Подрядчик" value={project.contractor_name ?? "Не выбран"} icon={<Building2 className="h-5 w-5" />} />
        <Stat label="Бюджет" value={formatBudget(project.budget_min, project.budget_max)} icon={<CircleDollarSign className="h-5 w-5" />} />
        <Stat label="Сроки" value={formatDateRange(project.desired_start_date, project.desired_end_date)} icon={<CalendarDays className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Предложения (${bidsResult.rows.length})`}>
          {bidsResult.rows.length === 0 ? <Empty text="Предложений нет." /> : (
            <div className="divide-y divide-border">
              {bidsResult.rows.map((bid) => (
                <div key={bid.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div><p className="font-semibold text-foreground">{bid.company_name ?? "Подрядчик"}</p><p className="mt-1 text-xs text-muted-foreground">{formatStatus(bid.status)} · {bid.duration_days} дн.</p></div>
                  <p className="text-sm font-bold text-foreground">{formatMoney(bid.price)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`Этапы (${stagesResult.rows.length})`}>
          {stagesResult.rows.length === 0 ? <Empty text="Этапов нет." /> : (
            <div className="divide-y divide-border">
              {stagesResult.rows.map((stage) => (
                <div key={stage.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div><p className="font-semibold text-foreground">{stage.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatStatus(stage.status)}</p></div>
                  <span className="text-sm font-bold text-primary">{stage.progress_weight}%</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel title="Последние события">
        {eventsResult.rows.length === 0 ? <Empty text="Событий нет." /> : (
          <div className="space-y-4">
            {eventsResult.rows.map((event) => (
              <div key={event.id} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{event.title}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                </div>
                {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><h2 className="text-xl font-bold text-foreground">{title}</h2><div className="mt-5">{children}</div></section>;
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-[1.5rem] border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-lg font-bold text-foreground">{value}</p></div>;
}

function Empty({ text }: { text: string }) { return <p className="text-sm text-muted-foreground">{text}</p>; }
function formatMoney(value: number | string) { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(value)); }
function formatBudget(min: number | string | null, max: number | string | null) { if (min != null && max != null) return `${formatMoney(min)} — ${formatMoney(max)}`; if (min != null) return `от ${formatMoney(min)}`; if (max != null) return `до ${formatMoney(max)}`; return "Не указан"; }
function formatDate(value: Date | string | null) { if (!value) return "—"; return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(value instanceof Date ? value : new Date(value)); }
function formatDateRange(start: Date | string | null, end: Date | string | null) { if (!start && !end) return "Не указаны"; return `${formatDate(start)} — ${formatDate(end)}`; }
function formatStatus(status: string) { const labels: Record<string, string> = { draft: "Черновик", published: "Опубликован", collecting_bids: "Сбор предложений", submitted: "Отправлено", viewed: "Просмотрено", shortlisted: "Короткий список", accepted: "Принято", rejected: "Отклонено", contractor_selected: "Подрядчик выбран", planned: "Запланирован", in_progress: "В работе", awaiting_review: "На проверке", revision_required: "Доработка", completed: "Завершён", disputed: "Спор", cancelled: "Отменён" }; return labels[status] ?? status; }
