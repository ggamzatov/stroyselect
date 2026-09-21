import { ArrowRight, BriefcaseBusiness, SearchX } from "lucide-react"
import { redirect } from "next/navigation"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageFrame } from "@/components/layout/page-frame"
import { PageHeader } from "@/components/patterns/page-header"
import { ButtonLink } from "@/components/ui/button"
import { AdSlot } from "@/features/ads/components/ad-slot"
import { ContractorProjectCard } from "@/features/projects/components/contractor-project-card"
import { getAvailableProjects } from "@/features/projects/queries/get-available-projects"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

export default async function ContractorProjectsPage() {
  const { profile } = await getCurrentProfile()
  if (profile.role !== "contractor") redirect("/dashboard")

  const { company, projects } = await getAvailableProjects()
  if (!company) return <ContractorNotice title="Сначала создайте профиль компании" description="Укажите услуги и города работы, чтобы видеть доступные заказы." href="/contractor/company" action="Создать профиль" />
  if (company.verification_status !== "verified") return <ContractorNotice title="Профиль ещё не подтверждён" description="Доступ к заказам откроется после проверки компании. Требования и текущий статус доступны в профиле." href="/contractor/company" action="Открыть профиль" />
  if (!company.accepts_new_projects) return <ContractorNotice title="Приём новых заказов выключен" description="Включите приём заказов в настройках компании, чтобы видеть подходящие возможности." href="/contractor/company" action="Настроить приём заказов" />

  const responded = projects.filter((project) => project.project_bids.some((bid) => bid.contractor_id === company.id)).length

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <PageHeader eyebrow="Заказы" title="Доступные заказы" description="Откройте заказ, оцените объём, бюджет и сроки, затем отправьте своё предложение." actions={<span className="inline-flex min-h-10 items-center rounded-full bg-secondary px-3 text-sm font-semibold text-primary">{projects.length} доступно</span>} />
      {responded ? <p className="mt-4 text-sm text-muted-foreground">По {responded} {formatOrders(responded)} вы уже отправили предложение — это отмечено на карточках.</p> : null}
      <AdSlot placement="project_feed" className="mt-5" />
      {projects.length ? <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Доступные заказы">{projects.map((project) => <ContractorProjectCard key={project.id} project={project} contractorId={company.id} />)}</section> : <EmptyState className="mt-6" icon={SearchX} title="Сейчас нет доступных заказов" description="Новые опубликованные заказы по вашим услугам и городам появятся здесь." action={<ButtonLink variant="outline" href="/contractor/company">Проверить профиль<ArrowRight data-icon="inline-end" /></ButtonLink>} />}
    </PageFrame>
  )
}

function ContractorNotice({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return <PageFrame size="narrow" className="flex min-h-[70vh] items-center"><section className="w-full rounded-[var(--radius-md)] border border-border bg-card p-6 text-center shadow-[var(--shadow-subtle)] sm:p-8"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary"><BriefcaseBusiness className="size-5" aria-hidden="true" /></span><h1 className="mt-5 text-xl font-semibold text-foreground">{title}</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p><ButtonLink className="mt-5" href={href}>{action}<ArrowRight data-icon="inline-end" /></ButtonLink></section></PageFrame>
}

function formatOrders(value: number) { const remainder = value % 100; if (remainder >= 11 && remainder <= 14) return "заказам"; if (value % 10 === 1) return "заказу"; return "заказам" }
