import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, CircleAlert, FolderKanban } from "lucide-react"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { PageFrame } from "@/components/layout/page-frame"
import { PageHeader } from "@/components/patterns/page-header"
import { ContractorBidCard } from "@/features/bids/components/contractor-bid-card"
import { getMyBids } from "@/features/bids/queries/get-my-bids"
import { ContractorReadiness } from "@/features/contractors/components/contractor-readiness"
import { ContractorObjectCard } from "@/features/projects/components/contractor-object-card"
import { ContractorProjectCard } from "@/features/projects/components/contractor-project-card"
import { getAssignedProjects } from "@/features/projects/queries/get-assigned-projects"
import { getAvailableProjects } from "@/features/projects/queries/get-available-projects"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { getContractorMarketplaceAccess } from "@/lib/subscriptions/contractor-marketplace-access"
import { getMyContractorCompany } from "@/features/contractors/queries/get-my-contractor-company"

export default async function ContractorDashboardPage() {
  const { profile } = await getCurrentProfile()
  if (profile.role !== "contractor") redirect("/dashboard")

  const company = await getMyContractorCompany()
  const access = company ? await getContractorMarketplaceAccess(company.id) : null
  const [bids, assignedProjects] = await Promise.all([getMyBids(), getAssignedProjects()])
  const canLoadOpportunities = Boolean(company && company.verification_status === "verified" && company.accepts_new_projects && access?.hasAccess)
  const opportunities = canLoadOpportunities ? (await getAvailableProjects()).projects.slice(0, 3) : []
  const activeObjects = assignedProjects.filter((project) => project.status !== "completed").slice(0, 3)
  const attention = getAttention(company, access?.hasAccess ?? false, assignedProjects)

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <PageHeader eyebrow="Кабинет подрядчика" title={`Здравствуйте, ${profile.first_name || "подрядчик"}`} description="Здесь — ближайшие действия, новые заказы и объекты, с которыми вы уже работаете." actions={<Button render={<Link href="/contractor/projects" />}><BriefcaseBusiness data-icon="inline-start" />Найти заказы</Button>} />

      {attention.length ? <section className="mt-6 rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]" aria-labelledby="attention-title"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning"><CircleAlert className="size-5" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-primary">Требует внимания</p><h2 id="attention-title" className="mt-1 text-lg font-semibold text-foreground">Ближайшие действия</h2></div></div><div className="mt-5 grid gap-2 lg:grid-cols-2">{attention.slice(0, 4).map((item) => <AttentionItem key={item.title} {...item} />)}</div></section> : null}

      <section className="mt-7" aria-labelledby="opportunities-title"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Новые возможности</p><h2 id="opportunities-title" className="mt-1 text-xl font-semibold tracking-tight text-foreground">Подходящие заказы</h2><p className="mt-1 text-sm text-muted-foreground">Откройте заказ, чтобы оценить объём, бюджет и сроки.</p></div><Link href="/contractor/projects" className="text-sm font-semibold text-primary hover:underline">Все заказы</Link></div>{opportunities.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{opportunities.map((project) => <ContractorProjectCard key={project.id} project={project} contractorId={company!.id} />)}</div> : <EmptyOpportunity ready={canLoadOpportunities} />}</section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2"><div><SectionHeader eyebrow="Мои предложения" title="Последние предложения" href="/contractor/bids" linkLabel="Все предложения" />{bids.length ? <div className="mt-4 space-y-4">{bids.slice(0, 3).map((bid) => <ContractorBidCard key={bid.id} bid={bid} />)}</div> : <EmptyInline title="Вы ещё не отправляли предложения" description="Найдите подходящий заказ и предложите заказчику стоимость и сроки." href="/contractor/projects" action="Найти заказы" />}</div><div><SectionHeader eyebrow="Объекты" title="Активные объекты" href="/contractor/work" linkLabel="Все объекты" />{activeObjects.length ? <div className="mt-4 space-y-3">{activeObjects.map((project) => <ContractorObjectCard key={project.id} project={project} />)}</div> : <EmptyInline title="Активных объектов пока нет" description="После выбора вашего предложения объект появится здесь." href="/contractor/projects" action="Найти заказы" />}</div></section>

      <ContractorReadiness className="mt-8" company={company} hasMarketplaceAccess={access?.hasAccess} hideWhenReady />
    </PageFrame>
  )
}

function getAttention(company: Awaited<ReturnType<typeof getMyContractorCompany>>, hasAccess: boolean, projects: Awaited<ReturnType<typeof getAssignedProjects>>) {
  const items: Array<{ title: string; description: string; href: string; action: string }> = []
  if (!company) items.push({ title: "Создайте профиль компании", description: "Укажите услуги и города работы, чтобы получать доступ к заказам.", href: "/contractor/company", action: "Создать профиль" })
  else {
    if (!company.contractor_services.length) items.push({ title: "Укажите услуги", description: "Без специализаций мы не сможем показать подходящие заказы.", href: "/contractor/company", action: "Настроить услуги" })
    if (!company.contractor_service_areas.length) items.push({ title: "Укажите города работы", description: "Города нужны для подбора доступных заказов.", href: "/contractor/company", action: "Настроить географию" })
    if (company.verification_status !== "verified") items.push({ title: verificationTitle(company.verification_status), description: "Текущий статус и нужные сведения доступны в профиле компании.", href: "/contractor/company", action: "Открыть профиль" })
    if (!company.accepts_new_projects) items.push({ title: "Включите приём новых заказов", description: "Пока приём выключен, новые заказы не отображаются.", href: "/contractor/company", action: "Настроить приём" })
    if (!hasAccess) items.push({ title: "Проверьте доступ к заказам", description: "Для просмотра доступных заказов нужен активный доступ к маркетплейсу.", href: "/contractor/subscription", action: "Открыть подписку" })
  }
  for (const project of projects.filter((item) => item.status === "contractor_selected" || item.status === "disputed")) items.push({ title: project.status === "disputed" ? `Проверьте ситуацию: «${project.title}»` : `Заказчик выбрал вас: «${project.title}»`, description: project.status === "disputed" ? "В объекте доступны действия по текущей ситуации." : "Следующий шаг — перейти к работе по объекту.", href: `/contractor/work/${project.id}`, action: "Открыть объект" })
  return items
}

function AttentionItem({ title, description, href, action }: { title: string; description: string; href: string; action: string }) { return <Link href={href} className="group flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border p-3.5 transition hover:border-primary/25 hover:bg-secondary/45"><span><span className="block text-sm font-semibold text-foreground">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">{action}<ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" /></span></Link> }
function SectionHeader({ eyebrow, title, href, linkLabel }: { eyebrow: string; title: string; href: string; linkLabel: string }) { return <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{title}</h2></div><Link href={href} className="text-sm font-semibold text-primary hover:underline">{linkLabel}</Link></div> }
function EmptyOpportunity({ ready }: { ready: boolean }) { return <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-border bg-card p-6"><p className="font-semibold text-foreground">{ready ? "Сейчас нет новых подходящих заказов" : "Заказы станут доступны после подготовки профиля"}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{ready ? "Новые опубликованные заказы появятся здесь автоматически." : "Проверьте готовность профиля и доступ к заказам в блоке выше."}</p></div> }
function EmptyInline({ title, description, href, action }: { title: string; description: string; href: string; action: string }) { return <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-border bg-card p-5"><FolderKanban className="size-5 text-primary" aria-hidden="true" /><h3 className="mt-3 font-semibold text-foreground">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p><Link href={href} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">{action}<ArrowRight className="size-4" aria-hidden="true" /></Link></div> }
function verificationTitle(status: string) { if (status === "pending") return "Профиль проверяется"; if (status === "rejected") return "Профиль требует исправлений"; if (status === "suspended") return "Профиль временно приостановлен"; return "Подготовьте профиль к проверке" }
