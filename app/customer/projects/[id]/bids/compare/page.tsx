import Link from "next/link"
import { ArrowLeft, Banknote, CalendarDays, Clock3, PackageCheck, ReceiptText, ShieldCheck, Star, UserRoundSearch } from "lucide-react"
import { redirect } from "next/navigation"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageFrame } from "@/components/layout/page-frame"
import { PageHeader } from "@/components/patterns/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { CustomerBidActions } from "@/features/bids/components/customer-bid-actions"
import { getProjectBidComparison, type BidComparisonItem } from "@/features/bids/queries/get-project-bid-comparison"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

type Props = { params: Promise<{ id: string }> }

export default async function CompareProjectBidsPage({ params }: Props) {
  const { id } = await params
  const { profile } = await getCurrentProfile()
  if (profile.role !== "customer") redirect("/dashboard")
  const { project, bids } = await getProjectBidComparison(id)

  return (
    <PageFrame size="wide" className="pb-28 md:pb-8">
      <Link href={`/customer/projects/${project.id}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft className="size-4" aria-hidden="true" />К задаче</Link>
      <PageHeader className="mt-3" eyebrow="Выбор исполнителя" title="Сравнение предложений" description={`Задача «${project.title}». Сравните условия и самостоятельно выберите подходящего специалиста.`} />

      {bids.length === 0 ? <EmptyState className="mt-8" title="Предложений пока нет" description="Когда специалисты откликнутся на задачу, их условия появятся на этой странице." /> : <section className="mt-8 grid gap-4 xl:grid-cols-2" aria-label="Предложения специалистов">{bids.map((bid) => <BidCard key={bid.id} bid={bid} />)}</section>}
    </PageFrame>
  )
}

function BidCard({ bid }: { bid: BidComparisonItem }) {
  const unavailable = ["accepted", "rejected", "withdrawn"].includes(bid.status)
  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-card shadow-[var(--shadow-subtle)]">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={bid.status}>{getBidStatus(bid.status)}</StatusBadge>{bid.latestRevisionNo > 1 ? <span className="text-xs text-muted-foreground">Обновлено: версия {bid.latestRevisionNo}</span> : null}</div><h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{bid.publicName}</h2></div><Link href={`/customer/contractors/${bid.contractorId}`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"><UserRoundSearch className="size-4 text-primary" aria-hidden="true" />Профиль</Link></div>
      </div>
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Fact icon={Banknote} label="Стоимость" value={formatMoney(bid.price)} emphasized /><Fact icon={Clock3} label="Срок" value={`${bid.durationDays} ${formatDays(bid.durationDays)}`} /><Fact icon={Star} label="Рейтинг" value={bid.ratingCount ? `${bid.rating.toFixed(1)} · ${bid.ratingCount}` : "Нет отзывов"} /><Fact icon={ShieldCheck} label="Гарантия" value={bid.warrantyMonths ? `${bid.warrantyMonths} мес.` : "Не указана"} /></div>
        <div className="mt-4 grid gap-3"><OfferDetail title="Состав работ" value={bid.scopeSummary} /><OfferDetail title="Материалы" value={bid.materialsSummary} icon={PackageCheck} /><OfferDetail title="Условия оплаты" value={bid.paymentTerms} icon={ReceiptText} />{bid.exclusions ? <OfferDetail title="Не входит в предложение" value={bid.exclusions} /> : null}</div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground"><span className="rounded-full bg-muted px-3 py-1.5">{bid.priceIncludesMaterials ? "Материалы включены в цену" : "Материалы оплачиваются отдельно"}</span>{bid.proposedStartDate ? <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5"><CalendarDays className="size-3.5 text-primary" aria-hidden="true" />Старт {formatDate(bid.proposedStartDate)}</span> : null}</div>
      </div>
      {!unavailable ? <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:static sm:bg-muted/35 sm:px-6"><p className="mb-3 text-sm font-medium text-foreground">Решение по предложению</p><CustomerBidActions bidId={bid.id} currentStatus={bid.status} /></div> : null}
    </article>
  )
}

function Fact({ icon: Icon, label, value, emphasized }: { icon: typeof Banknote; label: string; value: string; emphasized?: boolean }) { return <div className="rounded-[var(--radius-sm)] bg-muted/55 p-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 text-primary" aria-hidden="true" />{label}</p><p className={`mt-1.5 truncate text-foreground ${emphasized ? "font-semibold" : "text-sm font-medium"}`}>{value}</p></div> }
function OfferDetail({ title, value, icon: Icon }: { title: string; value: string | null; icon?: typeof PackageCheck }) { return <div className="rounded-[var(--radius-sm)] border border-border p-3.5"><p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{Icon ? <Icon className="size-3.5 text-primary" aria-hidden="true" /> : null}{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{value || "Не указано"}</p></div> }
function getBidStatus(status: string) { return ({ submitted: "Новое", viewed: "Просмотрено", shortlisted: "В коротком списке", accepted: "Принято", rejected: "Отклонено", withdrawn: "Отозвано" } as Record<string, string>)[status] ?? status }
function formatMoney(value: number) { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value) }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) }
function formatDays(value: number) { const lastTwo = value % 100; if (lastTwo >= 11 && lastTwo <= 14) return "дней"; if (value % 10 === 1) return "день"; if (value % 10 >= 2 && value % 10 <= 4) return "дня"; return "дней" }
