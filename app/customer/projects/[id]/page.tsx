import Link from "next/link"
import { ArrowLeft, Banknote, CalendarDays, FileText, MapPin, UsersRound } from "lucide-react"
import { redirect } from "next/navigation"

import { EntityHeader } from "@/components/patterns/entity-header"
import { PageFrame } from "@/components/layout/page-frame"
import { StatusBadge } from "@/components/ui/status-badge"
import { CustomerProjectNextAction } from "@/features/projects/components/customer-project-next-action"
import { getProjectPresentation } from "@/features/projects/components/customer-project-card"
import { ProjectLifecycle } from "@/features/projects/components/project-lifecycle"
import { getProjectBidComparison } from "@/features/bids/queries/get-project-bid-comparison"
import { getMyProject } from "@/features/projects/queries/get-my-project"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

type Props = { params: Promise<{ id: string }> }

export default async function CustomerProjectPage({ params }: Props) {
  const { id } = await params
  const { profile } = await getCurrentProfile()
  if (profile.role !== "customer") redirect("/dashboard")

  const [project, comparison] = await Promise.all([getMyProject(id), getProjectBidComparison(id)])
  const bidCount = comparison.bids.length
  const status = getProjectPresentation(project.status)

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <Link href="/customer/projects" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft className="size-4" aria-hidden="true" />Все задачи</Link>

      <EntityHeader
        className="mt-3"
        title={project.title}
        meta={`${project.service_categories?.name ?? "Категория не указана"} · ${project.city || "Город не указан"}`}
        status={{ value: project.status, label: status.label }}
        detail={<div className="flex flex-wrap gap-x-4 gap-y-2"><span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" aria-hidden="true" />{project.city || "Город не указан"}</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-primary" aria-hidden="true" />Создан {formatDate(project.created_at)}</span></div>}
      />

      <ProjectLifecycle status={project.status} className="mt-4" />

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] sm:p-6" aria-labelledby="project-task-title">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><FileText className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold text-primary">Задача</p><h2 id="project-task-title" className="mt-1 text-lg font-semibold text-foreground">Что нужно сделать</h2></div></div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground sm:text-base">{project.description || "Описание пока не заполнено."}</p>
          </section>

          <section className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] sm:p-6" aria-labelledby="project-offers-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-primary">Выбор исполнителя</p><h2 id="project-offers-title" className="mt-1 text-lg font-semibold text-foreground">Предложения и специалисты</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Получено предложений: {bidCount}. Выберите по фактам: цене, срокам и условиям.</p></div><div className="flex flex-wrap gap-2"><Link href={`/customer/projects/${project.id}/matches`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"><UsersRound className="size-4" aria-hidden="true" />Специалисты</Link>{bidCount > 0 ? <Link href={`/customer/projects/${project.id}/bids/compare`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-3 text-sm font-semibold text-primary-foreground">Сравнить предложения</Link> : null}</div></div>
          </section>

          <details className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] sm:p-6">
            <summary className="cursor-pointer list-none text-base font-semibold text-foreground">Детали задачи <span className="ml-2 text-sm font-normal text-muted-foreground">объект, бюджет и сроки</span></summary>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Detail label="Тип объекта" value={formatPropertyType(project.property_type)} />
              <Detail label="Категория" value={project.service_categories?.name} />
              <Detail label="Регион" value={project.region} />
              <Detail label="Город" value={project.city} />
              <Detail label="Адрес" value={project.address} wide />
              <Detail label="Вид работ" value={project.work_type} />
              <Detail label="Размеры / объём" value={project.dimensions} />
              <Detail label="Состояние объекта" value={project.current_condition} wide />
              <Detail label="Детали объёма" value={project.scope_details} wide />
              <Detail label="Бюджет" value={formatBudgetRange(project.budget_min, project.budget_max)} emphasized />
              <Detail label="Желаемое начало" value={formatDateOptional(project.desired_start_date)} />
              <Detail label="Желаемое завершение" value={formatDateOptional(project.desired_end_date)} />
              <Detail label="Опубликован" value={formatDateOptional(project.published_at)} />
            </div>
          </details>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <CustomerProjectNextAction projectId={project.id} status={project.status} bidCount={bidCount} />
          <section className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]"><div className="flex items-center gap-2"><Banknote className="size-4 text-primary" aria-hidden="true" /><h2 className="font-semibold text-foreground">Ориентиры задачи</h2></div><dl className="mt-4 space-y-3 text-sm"><InfoRow label="Бюджет" value={formatBudgetRange(project.budget_min, project.budget_max)} /><InfoRow label="Статус" value={<StatusBadge status={project.status}>{status.label}</StatusBadge>} /><InfoRow label="Обновлён" value={formatDate(project.updated_at)} /></dl></section>
        </aside>
      </div>
    </PageFrame>
  )
}

function Detail({ label, value, wide, emphasized }: { label: string; value: string | null | undefined; wide?: boolean; emphasized?: boolean }) {
  return <div className={`rounded-[var(--radius-sm)] bg-muted/55 p-3.5 ${wide ? "sm:col-span-2" : ""}`}><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1.5 whitespace-pre-wrap break-words text-foreground ${emphasized ? "font-semibold" : "text-sm font-medium"}`}>{value || "Не указано"}</p></div>
}
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"><dt className="text-muted-foreground">{label}</dt><dd className="max-w-[60%] text-right font-medium text-foreground">{value}</dd></div> }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)) }
function formatDateOptional(value: string | null) { return value ? formatDate(value) : "Не указано" }
function formatBudgetRange(min: number | null, max: number | null) { const formatter = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }); if (min !== null && max !== null) return `${formatter.format(min)} — ${formatter.format(max)}`; if (min !== null) return `от ${formatter.format(min)}`; if (max !== null) return `до ${formatter.format(max)}`; return "Не указан" }
function formatPropertyType(value: string | null) { const labels: Record<string, string> = { apartment: "Квартира", private_house: "Частный дом", commercial: "Коммерческий объект", land: "Земельный участок", industrial: "Производственный объект", other: "Другое" }; return value ? labels[value] ?? value : "Не указан" }
