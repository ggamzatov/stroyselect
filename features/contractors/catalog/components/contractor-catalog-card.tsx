import Link from "next/link";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, MapPin, Star } from "lucide-react";
import type { ContractorCatalogItem } from "@/features/contractors/catalog/types/contractor-catalog";

type Props = { contractor: ContractorCatalogItem };

export function ContractorCatalogCard({ contractor }: Props) {
  const primaryArea = contractor.areas.find((area) => area.is_primary) ?? contractor.areas[0] ?? null;
  const visibleServices = contractor.services.slice(0, 3);

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><Building2 className="h-6 w-6" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 text-lg font-black tracking-[-0.02em] text-foreground"><span className="truncate">{contractor.public_name}</span>{contractor.verification_status === "verified" ? <BadgeCheck className="h-4 w-4 shrink-0 fill-primary text-primary-foreground" aria-label="Проверен" /> : null}</h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{formatCompanyType(contractor.company_type)}</p>
            </div>
            {contractor.accepts_new_projects ? <span className="shrink-0 rounded-full bg-[#eaf6de] px-2.5 py-1 text-[10px] font-bold text-[#4b7f13]">Открыт к заказам</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />{contractor.rating_count > 0 ? <><strong className="text-sm text-foreground">{contractor.rating.toFixed(1)}</strong><span>({contractor.rating_count})</span></> : <span>Нет отзывов</span>}</span>
            <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="h-4 w-4 text-primary" aria-hidden="true" />{contractor.completed_projects_count} {formatProjectCount(contractor.completed_projects_count)}</span>
          </div>
        </div>
      </div>

      {visibleServices.length > 0 ? <div className="mt-4 flex flex-wrap gap-1.5">{visibleServices.map((service) => <span key={service.id} className="rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">{service.name}</span>)}{contractor.services.length > visibleServices.length ? <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">+{contractor.services.length - visibleServices.length}</span> : null}</div> : null}

      {contractor.description ? <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{contractor.description}</p> : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Info icon={<MapPin className="h-4 w-4" />} label="Где работает" value={primaryArea?.city ?? "Не указано"} />
        <Info icon={<BriefcaseBusiness className="h-4 w-4" />} label="Портфолио" value={contractor.portfolio_count > 0 ? `${contractor.portfolio_count} ${formatPortfolioCount(contractor.portfolio_count)}` : "Пока нет"} />
      </div>

      <div className="mt-4 rounded-xl bg-background px-4 py-3"><p className="text-[11px] font-semibold text-muted-foreground">Стоимость проектов</p><p className="mt-1 text-sm font-black text-foreground">{formatBudgetRange(contractor.minimum_project_budget, contractor.maximum_project_budget)}</p></div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">Можно узнать условия и задать вопрос</p>
        <Link href={`/customer/contractors/${contractor.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:opacity-95">Профиль<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl bg-secondary/45 px-3.5 py-3"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</span></div><p className="mt-1.5 truncate text-sm font-bold text-foreground">{value}</p></div>; }
function formatCompanyType(value: string | null) { switch (value) { case "individual": return "Частная бригада"; case "self_employed": return "Самозанятый"; case "entrepreneur": return "ИП"; case "company": return "Юридическое лицо"; default: return value ?? "Тип не указан"; } }
function formatBudgetRange(minimum: number | null, maximum: number | null) { if (minimum === null && maximum === null) return "Не указан"; if (minimum !== null && maximum !== null) return `${formatMoney(minimum)} — ${formatMoney(maximum)}`; if (minimum !== null) return `от ${formatMoney(minimum)}`; return `до ${formatMoney(maximum!)}`; }
function formatMoney(value: number) { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value); }
function formatProjectCount(count: number) { return decline(count, "проект", "проекта", "проектов"); }
function formatPortfolioCount(count: number) { return decline(count, "объект", "объекта", "объектов"); }
function decline(count: number, one: string, few: string, many: string) { const lastTwo = count % 100; const last = count % 10; if (lastTwo >= 11 && lastTwo <= 14) return many; if (last === 1) return one; if (last >= 2 && last <= 4) return few; return many; }
