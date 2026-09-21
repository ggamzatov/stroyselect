import Link from "next/link"
import { ArrowLeft, Banknote, CalendarDays, CheckCircle2, MapPin, Send } from "lucide-react"
import { redirect } from "next/navigation"

import { EntityHeader } from "@/components/patterns/entity-header"
import { PageFrame } from "@/components/layout/page-frame"
import { BidForm } from "@/features/bids/components/bid-form"
import { InvitationResponseCard } from "@/features/projects/components/invitation-response-card"
import { ContractorProjectBrief } from "@/features/projects/components/contractor-project-brief"
import { getContractorProjectInvitation } from "@/features/projects/queries/get-contractor-project-invitation"
import { getAvailableProject } from "@/features/projects/queries/get-available-project"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

type Props = { params: Promise<{ id: string }> }

export default async function ContractorProjectPage({ params }: Props) {
  const { id } = await params
  const { profile } = await getCurrentProfile()
  if (profile.role !== "contractor") redirect("/dashboard")

  const [{ project, existingBid }, invitation] = await Promise.all([getAvailableProject(id), getContractorProjectInvitation(id)])
  const bidState = existingBid ? getBidState(existingBid.status) : null

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <Link href="/contractor/projects" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft className="size-4" aria-hidden="true" />К заказам</Link>
      <EntityHeader
        className="mt-3"
        title={project.title}
        meta={`${project.service_categories?.name ?? "Строительные работы"} · ${project.city || "Город не указан"}`}
        status={{ label: bidState?.label ?? "Открыт для предложений", value: existingBid?.status, tone: bidState?.tone ?? "info" }}
        detail={<div className="flex flex-wrap gap-x-4 gap-y-2"><span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" aria-hidden="true" />{project.city || "Город не указан"}</span><span className="inline-flex items-center gap-1.5"><Banknote className="size-4 text-primary" aria-hidden="true" />{formatBudget(project.budget_min, project.budget_max)}</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-primary" aria-hidden="true" />Начало: {formatDate(project.desired_start_date)}</span></div>}
      />

      {invitation ? <div className="mt-4"><InvitationResponseCard invitation={invitation} /></div> : null}

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="order-2 xl:order-1"><ContractorProjectBrief project={project} /></div>
        <aside className="order-1 xl:order-2 xl:sticky xl:top-24">
          <section className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-card shadow-[var(--shadow-subtle)]">
            <div className="border-b border-border bg-secondary/40 px-5 py-4 sm:px-6"><p className="text-xs font-semibold text-primary">Ваше предложение</p><h2 className="mt-1 text-lg font-semibold text-foreground">{existingBid ? "Условия вашего предложения" : "Предложите условия"}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{existingBid ? "Заказчик видит эти условия при сравнении предложений." : "Укажите реальную стоимость, срок и состав работ — это увидит заказчик."}</p></div>
            {existingBid ? <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm text-muted-foreground sm:px-6"><CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />{getBidState(existingBid.status).description}</div> : <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm text-muted-foreground sm:px-6"><Send className="size-4 shrink-0 text-primary" aria-hidden="true" />После отправки заказчик сможет сравнить ваши условия.</div>}
            <div className="p-5 sm:p-6"><BidForm projectId={project.id} existingBid={existingBid} /></div>
          </section>
        </aside>
      </div>
    </PageFrame>
  )
}

function getBidState(status: string) {
  const states: Record<string, { label: string; description: string; tone: "info" | "success" | "warning" | "danger" | "neutral" }> = {
    submitted: { label: "Предложение отправлено", description: "Сейчас заказчик принимает решение.", tone: "info" },
    viewed: { label: "Заказчик посмотрел", description: "Сейчас заказчик принимает решение.", tone: "info" },
    shortlisted: { label: "В коротком списке", description: "Заказчик рассматривает ваше предложение среди финальных вариантов.", tone: "warning" },
    accepted: { label: "Заказчик выбрал вас", description: "Перейдите к объекту, чтобы продолжить работу.", tone: "success" },
    rejected: { label: "Не выбрано", description: "Заказчик выбрал другое предложение.", tone: "danger" },
    withdrawn: { label: "Предложение отозвано", description: "Это предложение больше не участвует в выборе.", tone: "neutral" },
  }
  return states[status] ?? { label: status, description: "Проверьте состояние предложения в разделе «Мои предложения».", tone: "neutral" as const }
}
function formatBudget(min: number | null, max: number | null) { const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value); if (min !== null && max !== null) return `${money(min)} — ${money(max)}`; if (min !== null) return `от ${money(min)}`; if (max !== null) return `до ${money(max)}`; return "Бюджет не указан" }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)) : "не указано" }
