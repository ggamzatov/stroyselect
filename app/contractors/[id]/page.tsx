import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, BriefcaseBusiness, Building2, CalendarDays, FileCheck2, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";

import { getPublicMarketplaceContractor } from "@/features/contractors/queries/get-public-marketplace-contractor";
import { getContractorScore } from "@/features/contractors/queries/get-contractor-score";
import { getContractorReviews } from "@/features/reviews/queries/get-contractor-reviews";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const company = await getPublicMarketplaceContractor(id);
  if (!company) return { title: "Подрядчик — СтройВыбор" };
  return {
    title: `${company.publicName} — подрядчик | СтройВыбор`,
    description: company.description?.slice(0,155) || `Проверенный подрядчик ${company.publicName}: специализации, опыт, портфолио и отзывы.`,
  };
}

export default async function PublicContractorPage({ params }: Props) {
  const { id } = await params;
  const company = await getPublicMarketplaceContractor(id);
  if (!company) notFound();
  const [reviews,score] = await Promise.all([getContractorReviews(id),getContractorScore(id)]);

  return (
    <main className="min-h-screen bg-background"><div className="app-container py-10 md:py-14">
      <Link href="/contractors" className="text-sm font-semibold text-muted-foreground hover:text-primary">← Все подрядчики</Link>
      <section className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><Building2 className="h-7 w-7" /></div><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">{company.publicName}</h1><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" />Проверен СтройВыбором</span></div><div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" />{company.rating.toFixed(1)} · {company.ratingCount} отзывов</span><span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-4 w-4" />{company.completedProjectsCount} завершённых проектов</span>{company.foundedYear && <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />Работает с {company.foundedYear}</span>}</div></div></div>{score && <div className="min-w-[210px] rounded-2xl bg-secondary/60 p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Sparkles className="h-4 w-4" />StroySelect Score</div><p className="mt-2 text-4xl font-black">{score.score}<span className="text-sm font-medium text-muted-foreground"> / 100</span></p><p className="mt-1 text-sm font-semibold">{score.label}</p></div>}</div>
        {company.description && <p className="mt-6 max-w-4xl text-sm leading-7 text-muted-foreground md:text-base">{company.description}</p>}
        <Link href="/register" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Создать проект и получить предложения</Link>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Section title="Специализации"><div className="flex flex-wrap gap-2">{company.services.map((service) => <span key={service.category_id} className="rounded-full bg-secondary px-3 py-2 text-sm font-semibold">{service.name}</span>)}</div></Section>
          <Section title={`Портфолио (${company.portfolio.length})`}>{company.portfolio.length ? <div className="grid gap-5 md:grid-cols-2">{company.portfolio.map((project) => <article key={project.id} className="rounded-2xl border border-border bg-background p-5"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><BriefcaseBusiness className="h-5 w-5" /></div><h3 className="mt-4 font-bold">{project.title}</h3>{project.city && <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{project.city}{project.completed_year ? ` · ${project.completed_year}` : ""}</p>}{project.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{project.description}</p>}</article>)}</div> : <Empty>Портфолио пока не заполнено.</Empty>}</Section>
          <Section title={`Отзывы (${reviews.total})`}>{reviews.total ? <div className="space-y-4">{reviews.reviews.map((review) => <article key={review.id} className="rounded-2xl border border-border bg-background p-5"><div className="flex justify-between gap-4"><strong>{review.projects?.title ?? "Завершённый проект"}</strong><span className="inline-flex items-center gap-1 font-bold"><Star className="h-4 w-4 text-amber-500" />{review.rating}</span></div>{review.comment && <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.comment}</p>}</article>)}</div> : <Empty>Отзывов пока нет.</Empty>}</Section>
        </div>
        <aside className="space-y-6">
          <Section title="Trust profile"><div className="space-y-3"><TrustLine icon={<ShieldCheck className="h-4 w-4" />} label="Проверка компании" value={company.verifiedAt ? `с ${formatDate(company.verifiedAt)}` : "подтверждена"} /><TrustLine icon={<FileCheck2 className="h-4 w-4" />} label="Проверенные документы" value={String(company.verifiedDocuments)} />{company.insuranceProvider && <TrustLine icon={<ShieldCheck className="h-4 w-4" />} label="Страхование" value={`${company.insuranceProvider}${company.insuranceExpiresAt ? ` · до ${formatDate(company.insuranceExpiresAt)}` : ""}`} />}{company.licenseSummary && <p className="rounded-xl bg-secondary/50 p-3 text-sm leading-6 text-muted-foreground">{company.licenseSummary}</p>}</div></Section>
          <Section title="География">{company.areas.length ? <div className="space-y-2">{company.areas.map((area,index) => <div key={`${area.city}-${index}`} className="rounded-xl bg-secondary/50 p-3 text-sm font-semibold"><MapPin className="mr-2 inline h-4 w-4 text-primary" />{area.city}{area.region ? <span className="block pl-6 text-xs font-normal text-muted-foreground">{area.region}</span> : null}</div>)}</div> : <Empty>Не указана.</Empty>}</Section>
          {score && <Section title="Факторы качества"><div className="space-y-3">{score.factors.slice(0,6).map((factor) => <div key={factor.key}><div className="flex justify-between gap-3 text-sm"><span>{factor.label}</span><strong>{factor.points}/{factor.maxPoints}</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width:`${Math.min(100,(factor.points/factor.maxPoints)*100)}%` }} /></div></div>)}</div></Section>}
        </aside>
      </div>
    </div></main>
  );
}

function Section({ title,children }: { title:string; children:React.ReactNode }) { return <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)]"><h2 className="text-xl font-bold">{title}</h2><div className="mt-5">{children}</div></section>; }
function Empty({ children }: { children:React.ReactNode }) { return <p className="text-sm text-muted-foreground">{children}</p>; }
function TrustLine({ icon,label,value }: { icon:React.ReactNode; label:string; value:string }) { return <div className="flex items-start gap-3 rounded-xl bg-secondary/45 p-3"><span className="mt-0.5 text-primary">{icon}</span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div></div>; }
function formatDate(value:string|Date) { return new Intl.DateTimeFormat("ru-RU").format(new Date(value)); }
