import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Star } from "lucide-react";

import { getPublicMarketplaceContractor } from "@/features/contractors/queries/get-public-marketplace-contractor";
import { getContractorReviews } from "@/features/reviews/queries/get-contractor-reviews";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const contractor = await getPublicMarketplaceContractor(id);
  if (!contractor) return { title: "Отзывы о подрядчике — СтройВыбор" };

  return {
    title: `Отзывы о ${contractor.publicName} — СтройВыбор`,
    description: `Отзывы заказчиков о подрядчике ${contractor.publicName}: оценки, комментарии и контекст завершённых проектов.`,
    robots: { index: true, follow: true },
  };
}

export default async function ContractorReviewsPage({ params }: Props) {
  const { id } = await params;
  const contractor = await getPublicMarketplaceContractor(id);
  if (!contractor) notFound();

  const reviews = await getContractorReviews(id);
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.reviews.filter((review) => Math.round(Number(review.rating)) === rating).length,
  }));

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-10 md:py-14">
        <nav className="text-sm text-muted-foreground">
          <Link href="/contractors" className="hover:text-primary">Подрядчики</Link>
          <span className="mx-2">→</span>
          <Link href={`/contractors/${contractor.id}`} className="hover:text-primary">{contractor.publicName}</Link>
          <span className="mx-2">→</span>
          <span>Отзывы</span>
        </nav>

        <section className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <BadgeCheck className="h-4 w-4" />Профиль подтверждён
              </div>
              <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-4xl">Отзывы о {contractor.publicName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Отзывы привязаны к проектам в СтройВыборе и помогают оценить качество работ, соблюдение сроков и взаимодействие с подрядчиком.</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-secondary px-5 py-4 text-center">
              <p className="text-3xl font-black text-primary">{contractor.rating.toFixed(1)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reviews.total} отзывов</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h2 className="font-bold">Распределение оценок</h2>
            <div className="mt-4 space-y-3">
              {distribution.map((item) => {
                const width = reviews.total > 0 ? Math.round((item.count / reviews.total) * 100) : 0;
                return <div key={item.rating}><div className="flex items-center justify-between gap-3 text-xs"><span className="inline-flex items-center gap-1 font-semibold">{item.rating}<Star className="h-3.5 w-3.5 text-amber-500" /></span><span className="text-muted-foreground">{item.count}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} /></div></div>;
              })}
            </div>
            <Link href={`/contractors/${contractor.id}`} className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold">Вернуться в профиль</Link>
          </aside>

          <section className="space-y-4">
            {reviews.reviews.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Публичных отзывов пока нет.</div>
            ) : reviews.reviews.map((review) => (
              <article key={review.id} className="min-w-0 rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">Завершённый проект</p><h2 className="mt-1 break-words font-bold">{review.projects?.title ?? "Проект заказчика"}</h2></div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold"><Star className="h-4 w-4 text-amber-500" />{review.rating}</span>
                </div>
                {review.comment && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{review.comment}</p>}
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
