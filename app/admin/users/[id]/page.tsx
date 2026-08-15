import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Building2, CalendarDays, FolderKanban, Mail, MapPin, Phone, UserRound } from "lucide-react";

import { db } from "@/lib/db/pool";
import { UserAdminActions } from "@/features/admin/components/user-admin-actions";

type Props = { params: Promise<{ id: string }> };

type ProfileRow = {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export default async function AdminUserPage({ params }: Props) {
  const { id } = await params;

  const profileResult = await db.query<ProfileRow>(
    `
      SELECT
        id,
        role::text AS role,
        first_name,
        last_name,
        email,
        phone,
        city,
        is_blocked,
        blocked_reason,
        blocked_at,
        created_at,
        updated_at
      FROM public.profiles
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  const profile = profileResult.rows[0];
  if (!profile) notFound();

  const [companyResult, projectsResult, sessionsResult] = await Promise.all([
    profile.role === "contractor"
      ? db.query<{
          id: string;
          public_name: string;
          legal_name: string | null;
          verification_status: string;
          rating: number | string;
          rating_count: number;
        }>(
          `
            SELECT
              id,
              public_name,
              legal_name,
              verification_status::text AS verification_status,
              rating,
              rating_count
            FROM public.contractor_companies
            WHERE owner_id = $1
            LIMIT 1
          `,
          [id]
        )
      : Promise.resolve({ rows: [] as Array<{ id: string; public_name: string; legal_name: string | null; verification_status: string; rating: number | string; rating_count: number }> }),
    db.query<{
      id: string;
      title: string;
      status: string;
      created_at: Date | string;
    }>(
      `
        SELECT id, title, status::text AS status, created_at
        FROM public.projects
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [id]
    ),
    db.query<{
      created_at: Date | string;
      expires_at: Date | string;
      revoked_at: Date | string | null;
      last_seen_at: Date | string | null;
      user_agent: string | null;
      ip_address: string | null;
    }>(
      `
        SELECT created_at, expires_at, revoked_at, last_seen_at, user_agent, ip_address
        FROM public.auth_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [id]
    ),
  ]);

  const company = companyResult.rows[0] ?? null;
  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Пользователь";

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> К пользователям
      </Link>

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">{formatRole(profile.role)}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground">{displayName}</h1>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile.email && <span className="inline-flex items-center gap-1"><Mail className="h-4 w-4" />{profile.email}</span>}
              {profile.phone && <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{profile.phone}</span>}
              {profile.city && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.city}</span>}
            </div>
            {profile.is_blocked && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold">Учётная запись заблокирована</p>
                {profile.blocked_reason && <p className="mt-1">{profile.blocked_reason}</p>}
              </div>
            )}
          </div>
          <div className="w-full max-w-md">
            <UserAdminActions userId={profile.id} isBlocked={profile.is_blocked} role={profile.role} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Создан" value={formatDate(profile.created_at)} icon={<CalendarDays className="h-5 w-5" />} />
        <Stat label="Роль" value={formatRole(profile.role)} icon={<UserRound className="h-5 w-5" />} />
        <Stat label="Состояние" value={profile.is_blocked ? "Заблокирован" : "Активен"} icon={<UserRound className="h-5 w-5" />} />
      </section>

      {company && (
        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Компания подрядчика</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{company.public_name}</h2>
              {company.legal_name && <p className="mt-1 text-sm text-muted-foreground">{company.legal_name}</p>}
              <p className="mt-3 text-sm text-muted-foreground">Статус: {formatVerificationStatus(company.verification_status)} · рейтинг {Number(company.rating).toFixed(1)} ({company.rating_count})</p>
            </div>
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <Link href={`/admin/contractors/${company.id}`} className="mt-5 inline-flex items-center text-sm font-semibold text-primary">Открыть профиль подрядчика</Link>
        </section>
      )}

      {profile.role === "customer" && (
        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-foreground">Последние проекты</h2><FolderKanban className="h-5 w-5 text-primary" /></div>
          <div className="mt-5">
            {projectsResult.rows.length === 0 ? <p className="text-sm text-muted-foreground">Проектов нет.</p> : (
              <div className="divide-y divide-border">
                {projectsResult.rows.map((project) => (
                  <Link key={project.id} href={`/admin/projects/${project.id}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div><p className="font-semibold text-foreground">{project.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatStatus(project.status)} · {formatDate(project.created_at)}</p></div>
                    <span className="text-sm font-semibold text-primary">Открыть</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-bold text-foreground">Сессии</h2>
        <div className="mt-5 space-y-3">
          {sessionsResult.rows.length === 0 ? <p className="text-sm text-muted-foreground">Сессий нет.</p> : sessionsResult.rows.map((session, index) => (
            <div key={`${formatDate(session.created_at)}-${index}`} className="rounded-xl border border-border bg-background/60 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-foreground">{session.revoked_at ? "Отозвана" : "Активна"}</span><span className="text-muted-foreground">{formatDateTime(session.created_at)}</span></div>
              <p className="mt-2 break-words text-xs text-muted-foreground">{session.user_agent ?? "Устройство не определено"}{session.ip_address ? ` · ${session.ip_address}` : ""}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="rounded-[1.5rem] border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-lg font-bold text-foreground">{value}</p></div>; }
function formatDate(value: Date | string | null) { if (!value) return "—"; return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(value instanceof Date ? value : new Date(value)); }
function formatDateTime(value: Date | string | null) { if (!value) return "—"; return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(value instanceof Date ? value : new Date(value)); }
function formatRole(role: string) { const labels: Record<string, string> = { customer: "Заказчик", contractor: "Подрядчик", admin: "Администратор", moderator: "Модератор", manager: "Менеджер" }; return labels[role] ?? role; }
function formatVerificationStatus(status: string) { const labels: Record<string, string> = { draft: "Черновик", pending: "На проверке", verified: "Подтверждён", rejected: "Отклонён", suspended: "Приостановлен" }; return labels[status] ?? status; }
function formatStatus(status: string) { const labels: Record<string, string> = { draft: "Черновик", published: "Опубликован", collecting_bids: "Сбор предложений", contractor_selected: "Подрядчик выбран", in_progress: "В работе", completed: "Завершён", disputed: "Спор", cancelled: "Отменён" }; return labels[status] ?? status; }
