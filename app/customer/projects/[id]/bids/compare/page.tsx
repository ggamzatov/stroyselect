import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Clock3,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  TriangleAlert,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import {
  getProjectBidComparison,
  type BidComparisonItem,
} from "@/features/bids/queries/get-project-bid-comparison";
import { CustomerBidActions } from "@/features/bids/components/customer-bid-actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompareProjectBidsPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");

  const { project, bids } = await getProjectBidComparison(id);

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link
          href={`/customer/projects/${project.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться к проекту
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-4 w-4" />
              StroySelect Bid Compare
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
              Сравнение предложений
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              Проект «{project.title}». Сравнение учитывает цену, срок, полноту сметы, рейтинг подрядчика и объяснимый StroySelect Score.
            </p>
          </div>
        </section>

        {bids.length === 0 ? (
          <section className="mt-6 rounded-[1.75rem] border border-dashed border-border bg-card p-8 text-center">
            <h2 className="text-xl font-bold text-foreground">Предложений пока нет</h2>
            <p className="mt-2 text-sm text-muted-foreground">Когда подрядчики отправят структурированные предложения, они появятся здесь.</p>
          </section>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {bids.map((bid, index) => (
              <BidCard key={bid.id} bid={bid} position={index + 1} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function BidCard({ bid, position }: { bid: BidComparisonItem; position: number }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="border-b border-border bg-secondary/30 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">#{position}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" /> Проверен
              </span>
              <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-bold text-foreground">Полнота {bid.completenessScore}%</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" /> Score {Math.round(bid.stroyselectScore)}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-black text-foreground">{bid.publicName}</h2>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-primary">{bid.comparisonScore}</p>
            <p className="text-[11px] text-muted-foreground">итоговый балл</p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={<Banknote className="h-4 w-4" />} label="Цена" value={formatMoney(bid.price)} />
          <Metric icon={<Clock3 className="h-4 w-4" />} label="Срок" value={`${bid.durationDays} дн.`} />
          <Metric icon={<Star className="h-4 w-4" />} label="Рейтинг" value={bid.ratingCount > 0 ? bid.rating.toFixed(1) : "Новый"} />
          <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Гарантия" value={`${bid.warrantyMonths ?? 0} мес.`} />
        </div>

        <div className="mt-5 grid gap-4">
          <Detail title="Состав работ" icon={<Sparkles className="h-4 w-4" />} text={bid.scopeSummary} />
          <Detail title="Материалы" icon={<PackageCheck className="h-4 w-4" />} text={bid.materialsSummary} />
          <Detail title="Условия оплаты" icon={<ReceiptText className="h-4 w-4" />} text={bid.paymentTerms} />
          {bid.exclusions && <Detail title="Не входит" icon={<TriangleAlert className="h-4 w-4" />} text={bid.exclusions} />}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
            {bid.priceIncludesMaterials ? "Материалы включены в цену" : "Материалы оплачиваются отдельно"}
          </span>
          {bid.proposedStartDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> старт {formatDate(bid.proposedStartDate)}
            </span>
          )}
        </div>

        {bid.riskFlags.length > 0 && (
          <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Что проверить перед выбором</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {bid.riskFlags.map((flag) => <li key={flag}>• {flag}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/customer/contractors/${bid.contractorId}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-primary"
          >
            Профиль и Score
          </Link>
          {!['accepted', 'rejected', 'withdrawn'].includes(bid.status) && (
            <div className="min-w-[220px] flex-1">
              <CustomerBidActions bidId={bid.id} currentStatus={bid.status} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/45 p-3">
      <div className="flex items-center gap-1.5 text-primary">{icon}<span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</span></div>
      <p className="mt-2 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function Detail({ title, icon, text }: { title: string; icon: React.ReactNode; text: string | null }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-primary">{icon}<p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</p></div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{text || "Не указано"}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}
