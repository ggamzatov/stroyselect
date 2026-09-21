import Link from "next/link"
import { ArrowRight, Banknote, CalendarDays, Clock3, MapPin } from "lucide-react"

import { StatusBadge } from "@/components/ui/status-badge"
import { getBidState } from "@/features/projects/components/contractor-project-card"

export type ContractorBid = {
  id: string
  project_id: string
  price: number
  duration_days: number
  message: string | null
  proposed_start_date: string | null
  status: string
  created_at: string
  projects: { id: string; title: string; city: string; status: string; budget_min: number | null; budget_max: number | null } | null
}

export function ContractorBidCard({ bid }: { bid: ContractorBid }) {
  const selected = bid.status === "accepted"
  const href = selected ? `/contractor/work/${bid.project_id}` : `/contractor/projects/${bid.project_id}`

  return (
    <article className="rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={bid.status}>{getBidState(bid.status)}</StatusBadge><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" />Отправлено {formatDate(bid.created_at)}</span></div>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{bid.projects?.title ?? "Заказ"}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" aria-hidden="true" />{bid.projects?.city || "Город не указан"}</p>
          {bid.message ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{bid.message}</p> : null}
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[320px]">
          <Fact icon={Banknote} label="Моё предложение" value={formatMoney(bid.price)} emphasized />
          <Fact icon={Clock3} label="Срок" value={`${bid.duration_days} ${formatDays(bid.duration_days)}`} />
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">{getBidHint(bid.status)}</p><Link href={href} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-secondary">{selected ? "Перейти к объекту" : "Открыть заказ"}<ArrowRight className="size-4 text-primary" aria-hidden="true" /></Link></div>
    </article>
  )
}

function Fact({ icon: Icon, label, value, emphasized }: { icon: typeof Banknote; label: string; value: string; emphasized?: boolean }) { return <div className="rounded-[var(--radius-sm)] bg-muted/55 p-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 text-primary" aria-hidden="true" />{label}</p><p className={`mt-1.5 truncate text-foreground ${emphasized ? "font-semibold" : "text-sm font-medium"}`}>{value}</p></div> }
function getBidHint(status: string) { if (status === "accepted") return "Заказчик выбрал ваше предложение. Продолжите работу по объекту."; if (["submitted", "viewed", "shortlisted"].includes(status)) return "Сейчас решение принимает заказчик."; if (status === "rejected") return "Заказчик выбрал другое предложение."; return "Предложение больше не участвует в выборе." }
function formatMoney(value: number) { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value) }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)) }
function formatDays(value: number) { const last = value % 100; if (last >= 11 && last <= 14) return "дней"; if (value % 10 === 1) return "день"; if (value % 10 >= 2 && value % 10 <= 4) return "дня"; return "дней" }
