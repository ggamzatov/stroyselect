import Link from "next/link";

import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";

import { getContractorReview } from
  "@/features/admin/contractors/queries/get-contractor-review";
import { VerificationStatusBadge } from
  "@/features/admin/components/verification-status-badge";
import { ContractorReviewActions } from
  "@/features/admin/components/contractor-review-actions";

type Props = { params: Promise<{ id: string }> };

export default async function ContractorReviewPage({ params }: Props) {
  const { id } = await params;
  const { company, owner, logs } = await getContractorReview(id);

  return (
    <div className="space-y-6">
      <Link href="/admin/contractors" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Вернуться к подрядчикам
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/70 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.3rem] bg-primary text-primary-foreground"><Building2 className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Проверка подрядчика</p>
              <h1 className="mt-1 break-words text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">{company.public_name}</h1>
              {company.legal_name && <p className="mt-2 text-sm text-muted-foreground">{company.legal_name}</p>}
            </div>
          </div>
          <VerificationStatusBadge status={company.verification_status} />
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <InfoSection title="Основная информация" icon={<Building2 className="h-5 w-5" />}>
            <InfoRow label="Публичное название" value={company.public_name} />
            <InfoRow label="Юридическое название" value={company.legal_name} />
            <InfoRow label="Тип подрядчика" value={formatCompanyType(company.company_type)} />
            <InfoRow label="ИНН" value={company.inn} />
            <InfoRow label="ОГРН / ОГРНИП" value={company.ogrn} />
            <InfoRow label="Год начала работы" value={company.founded_year?.toString() ?? null} />
            <InfoRow label="Количество сотрудников" value={company.employee_count?.toString() ?? null} />
          </InfoSection>

          <InfoSection title="Описание компании" icon={<BadgeCheck className="h-5 w-5" />}>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{company.description || "Описание не указано"}</p>
          </InfoSection>

          <InfoSection title="Диапазон проектов" icon={<Banknote className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <DataCard label="Минимальный бюджет" value={formatMoney(company.minimum_project_budget) ?? "Не указан"} />
              <DataCard label="Максимальный бюджет" value={formatMoney(company.maximum_project_budget) ?? "Не указан"} />
              <DataCard label="Новые проекты" value={company.accepts_new_projects ? "Принимает" : "Не принимает"} />
            </div>
          </InfoSection>

          <InfoSection title="Специализации" icon={<Wrench className="h-5 w-5" />}>
            {company.contractor_services?.length ? (
              <div className="flex flex-wrap gap-2">
                {company.contractor_services.map((service) => (
                  <span key={service.category_id} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-primary">
                    {service.service_categories?.name ?? `Категория ${service.category_id}`}
                  </span>
                ))}
              </div>
            ) : <EmptyText text="Специализации не указаны" />}
          </InfoSection>

          <InfoSection title="География работы" icon={<MapPin className="h-5 w-5" />}>
            {company.contractor_service_areas?.length ? (
              <div className="flex flex-wrap gap-2">
                {company.contractor_service_areas.map((area) => (
                  <span key={area.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {area.city}
                  </span>
                ))}
              </div>
            ) : <EmptyText text="Города работы не указаны" />}
          </InfoSection>

          <InfoSection title="Контактные данные" icon={<Phone className="h-5 w-5" />}>
            <ContactGrid>
              <ContactItem icon={<Phone className="h-4 w-4" />} label="Телефон" value={company.contact_phone} />
              <ContactItem icon={<Mail className="h-4 w-4" />} label="Email" value={company.contact_email} />
              <ContactItem icon={<Building2 className="h-4 w-4" />} label="Сайт" value={company.website} />
              <ContactItem icon={<UserRound className="h-4 w-4" />} label="Telegram" value={company.telegram} />
            </ContactGrid>
          </InfoSection>

          <InfoSection title="Владелец аккаунта" icon={<UserRound className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <DataCard label="Имя" value={owner ? `${owner.first_name} ${owner.last_name ?? ""}`.trim() : "Не указано"} />
              <DataCard label="Телефон" value={owner?.phone ?? "Не указан"} />
              <DataCard label="Город" value={owner?.city ?? "Не указан"} />
            </div>
          </InfoSection>

          <VerificationHistory logs={logs} />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary"><ShieldCheck className="h-5 w-5" /></span>
              <div><p className="text-sm font-semibold text-foreground">Модерация</p><p className="text-xs text-muted-foreground">Решение по профилю</p></div>
            </div>
            <div className="mt-5"><ContractorReviewActions contractorId={company.id} currentStatus={company.verification_status} /></div>
          </section>

          <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="font-bold text-foreground">Краткая информация</h2>
            <div className="mt-5 space-y-4">
              <SidebarLine icon={<CalendarDays className="h-4 w-4" />} label="Начало работы" value={company.founded_year ? String(company.founded_year) : "Не указано"} />
              <SidebarLine icon={<UsersRound className="h-4 w-4" />} label="Сотрудников" value={company.employee_count ? String(company.employee_count) : "Не указано"} />
              <SidebarLine icon={<Clock3 className="h-4 w-4" />} label="Решений" value={String(logs.length)} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InfoSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">{icon}</span><h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2></div><div className="mt-6 space-y-4">{children}</div></section>;
}
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) { return <div className="grid gap-1 border-b border-border pb-4 last:border-0 last:pb-0 md:grid-cols-[220px_minmax(0,1fr)]"><span className="text-sm text-muted-foreground">{label}</span><span className="break-words font-semibold text-foreground">{value || "Не указано"}</span></div>; }
function DataCard({ label, value }: { label: string; value: string }) { return <div className="rounded-[1.3rem] border border-border bg-background/60 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-bold text-foreground">{value}</p></div>; }
function ContactGrid({ children }: { children: React.ReactNode }) { return <div className="grid gap-3 sm:grid-cols-2">{children}</div>; }
function ContactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) { return <div className="rounded-[1.25rem] border border-border bg-background/60 p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-semibold">{label}</span></div><p className="mt-2 break-all text-sm font-semibold text-foreground">{value || "Не указано"}</p></div>; }
function SidebarLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-sm font-semibold text-foreground">{value}</p></div></div>; }
function EmptyText({ text }: { text: string }) { return <p className="text-sm text-muted-foreground">{text}</p>; }

function VerificationHistory({ logs }: { logs: Array<{ id: string; previous_status: string; new_status: string; comment: string | null; created_at: string; admin_id: string }> }) {
  return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary"><Clock3 className="h-5 w-5" /></span><div><h2 className="text-xl font-bold text-foreground">История проверки</h2><p className="mt-1 text-xs text-muted-foreground">Все решения администрации</p></div></div>{logs.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Решений по профилю пока нет.</p> : <div className="relative mt-6 space-y-4">{logs.map((log) => <article key={log.id} className="relative rounded-[1.3rem] border border-border bg-background/60 p-4"><p className="font-semibold text-foreground">{formatVerificationStatus(log.previous_status)}{" → "}{formatVerificationStatus(log.new_status)}</p>{log.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{log.comment}</p>}<p className="mt-3 text-xs text-muted-foreground/70">{formatDateTime(log.created_at)}</p></article>)}</div>}</section>;
}

function formatVerificationStatus(value: string) { switch (value) { case "pending": return "На проверке"; case "verified": return "Подтверждён"; case "rejected": return "Отклонён"; case "suspended": return "Приостановлен"; case "draft": return "Черновик"; default: return value; } }
function formatCompanyType(value: string | null) { switch (value) { case "individual": return "Частная бригада"; case "self_employed": return "Самозанятый"; case "entrepreneur": return "Индивидуальный предприниматель"; case "company": return "Юридическое лицо"; default: return null; } }
function formatMoney(value: number | string | null) { if (value === null) return null; return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
