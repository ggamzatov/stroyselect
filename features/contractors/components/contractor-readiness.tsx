import Link from "next/link"
import { ArrowRight, Check, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

type Company = {
  public_name: string
  verification_status: string
  accepts_new_projects: boolean
  contractor_services: Array<unknown>
  contractor_service_areas: Array<unknown>
}

type Props = {
  company: Company | null
  hasMarketplaceAccess?: boolean
  className?: string
  hideWhenReady?: boolean
}

/** A checklist made solely from existing company, verification, availability and access state. */
export function ContractorReadiness({ company, hasMarketplaceAccess, className, hideWhenReady = false }: Props) {
  const items = getReadinessItems(company, hasMarketplaceAccess)
  const action = items.find((item) => !item.done)
  if (hideWhenReady && !action) return null

  return (
    <section className={cn("rounded-[var(--radius-md)] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]", className)} aria-labelledby="contractor-readiness-title">
      <p className="text-sm font-semibold text-primary">Готовность к заказам</p>
      <h2 id="contractor-readiness-title" className="mt-1 text-lg font-semibold text-foreground">{action ? "Проверьте, что доступно для работы" : "Вы готовы принимать новые заказы"}</h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => <li key={item.label} className="flex items-start gap-2.5 text-sm"><span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", item.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{item.done ? <Check className="size-3" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}</span><span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span></li>)}
      </ul>
      {action ? <Link href={action.href} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--primary-hover)]">{action.action}<ArrowRight className="size-4" aria-hidden="true" /></Link> : <Link href="/contractor/company" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">Открыть профиль компании<ArrowRight className="size-4" aria-hidden="true" /></Link>}
    </section>
  )
}

function getReadinessItems(company: Company | null, hasMarketplaceAccess?: boolean) {
  const isVerified = company?.verification_status === "verified"
  const items = [
    { label: "Профиль компании создан", done: Boolean(company), href: "/contractor/company", action: "Создать профиль" },
    { label: "Услуги указаны", done: Boolean(company && company.contractor_services.length > 0), href: "/contractor/company", action: "Указать услуги" },
    { label: "Города работы указаны", done: Boolean(company && company.contractor_service_areas.length > 0), href: "/contractor/company", action: "Указать города" },
    { label: verificationLabel(company?.verification_status), done: isVerified, href: "/contractor/company", action: verificationAction(company?.verification_status) },
    { label: "Приём новых заказов включён", done: Boolean(company?.accepts_new_projects), href: "/contractor/company", action: "Включить приём заказов" },
  ]
  if (hasMarketplaceAccess !== undefined) items.push({ label: "Доступ к заказам активен", done: hasMarketplaceAccess, href: "/contractor/subscription", action: "Проверить подписку" })
  return items
}

function verificationLabel(status: string | undefined) {
  if (status === "verified") return "Профиль подтверждён"
  if (status === "pending") return "Профиль проверяется"
  if (status === "rejected") return "Профиль требует исправлений"
  if (status === "suspended") return "Профиль временно приостановлен"
  return "Профиль ожидает проверки"
}

function verificationAction(status: string | undefined) {
  if (status === "pending") return "Открыть профиль"
  if (status === "rejected") return "Исправить профиль"
  return "Подготовить профиль"
}
