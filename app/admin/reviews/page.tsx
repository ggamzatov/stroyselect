import { Eye, EyeOff, Flag, Star } from "lucide-react";

import { getAdminReviews } from "@/features/admin/reviews/queries/get-admin-reviews";
import { moderateContractorReview } from "@/features/admin/reviews/actions/moderate-review";

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews();
  const flagged = reviews.filter((review) => review.moderation_status === "flagged").length;
  const hidden = reviews.filter((review) => review.moderation_status === "hidden").length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <p className="text-sm font-semibold text-primary">Доверие и репутация</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">Модерация отзывов</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Отзывы привязаны к завершённым проектам. Администратор может скрыть спорный отзыв, вернуть его в публикацию или отметить для дополнительной проверки.</p>
        <div className="mt-5 flex gap-3 text-sm"><span className="rounded-xl bg-secondary px-3 py-2">Всего: <strong>{reviews.length}</strong></span><span className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">На проверке: <strong>{flagged}</strong></span><span className="rounded-xl bg-red-50 px-3 py-2 text-red-800">Скрыто: <strong>{hidden}</strong></span></div>
      </section>

      <div className="space-y-4">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={review.moderation_status} />
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-foreground"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{review.rating}/5</span>
                  <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-foreground">{review.contractor_name ?? "Подрядчик"}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{review.project_title ?? "Проект"} · {review.customer_name}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Score label="Качество" value={review.quality_rating} />
                  <Score label="Сроки" value={review.deadline_rating} />
                  <Score label="Общение" value={review.communication_rating} />
                  <Score label="Бюджет" value={review.budget_rating} />
                </div>
                {review.comment && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{review.comment}</p>}
                {review.moderation_note && <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">Комментарий модерации: {review.moderation_note}</p>}
              </div>

              <form action={moderateContractorReview} className="w-full space-y-2 lg:w-72">
                <input type="hidden" name="id" value={review.id} />
                <textarea name="note" maxLength={3000} placeholder="Причина решения (необязательно)" className="stroy-input min-h-20 resize-y" />
                <div className="grid grid-cols-3 gap-2">
                  <button name="status" value="published" title="Опубликовать" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background text-emerald-700"><Eye className="h-4 w-4" /></button>
                  <button name="status" value="flagged" title="На проверку" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background text-amber-700"><Flag className="h-4 w-4" /></button>
                  <button name="status" value="hidden" title="Скрыть" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background text-red-700"><EyeOff className="h-4 w-4" /></button>
                </div>
              </form>
            </div>
          </article>
        ))}
        {reviews.length === 0 && <div className="rounded-[1.5rem] border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Отзывов пока нет.</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status === "hidden" ? "Скрыт" : status === "flagged" ? "На проверке" : "Опубликован";
  return <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">{label}</span>;
}
function Score({ label, value }: { label: string; value: number | null }) {
  return <span className="rounded-full border border-border px-3 py-1">{label}: {value ?? "—"}</span>;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
}
