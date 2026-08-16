"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Send,
  Star,
  TriangleAlert,
} from "lucide-react";

import { saveContractorReview } from "@/features/reviews/actions/save-contractor-review";

type ExistingReview = {
  id: string;
  rating: number;
  quality_rating: number | null;
  deadline_rating: number | null;
  communication_rating: number | null;
  budget_rating?: number | null;
  comment: string | null;
};

type Props = { projectId: string; review: ExistingReview | null };

export function ContractorReviewForm({ projectId, review }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [qualityRating, setQualityRating] = useState(review?.quality_rating ?? 0);
  const [deadlineRating, setDeadlineRating] = useState(review?.deadline_rating ?? 0);
  const [communicationRating, setCommunicationRating] = useState(review?.communication_rating ?? 0);
  const [budgetRating, setBudgetRating] = useState(review?.budget_rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (rating < 1 || rating > 5) {
      setErrorMessage("Поставьте общую оценку подрядчику");
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    startTransition(async () => {
      const result = await saveContractorReview({
        projectId,
        rating,
        qualityRating: qualityRating > 0 ? qualityRating : undefined,
        deadlineRating: deadlineRating > 0 ? deadlineRating : undefined,
        communicationRating: communicationRating > 0 ? communicationRating : undefined,
        budgetRating: budgetRating > 0 ? budgetRating : undefined,
        comment,
      });
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      setSuccessMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.5rem] border border-border bg-background/60 p-5">
        <RatingRow
          label="Общая оценка"
          description="Ваше общее впечатление от работы подрядчика."
          value={rating}
          onChange={setRating}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RatingCard label="Качество работ" value={qualityRating} onChange={setQualityRating} />
        <RatingCard label="Соблюдение сроков" value={deadlineRating} onChange={setDeadlineRating} />
        <RatingCard label="Коммуникация" value={communicationRating} onChange={setCommunicationRating} />
        <RatingCard label="Соблюдение бюджета" value={budgetRating} onChange={setBudgetRating} />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Ваш отзыв</p>
        </div>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={3000}
          rows={6}
          className="stroy-textarea"
          placeholder="Расскажите о качестве, сроках, бюджете и взаимодействии с подрядчиком..."
        />
        <div className="mt-2 flex justify-end"><span className="text-xs text-muted-foreground">{comment.length}/3000</span></div>
      </div>

      {successMessage && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm">{successMessage}</p></div>
        </div>
      )}
      {errorMessage && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm">{errorMessage}</p></div>
        </div>
      )}

      <div className="flex justify-end border-t border-border pt-5">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[#5c3b2a] disabled:opacity-50"
        >
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Сохраняем...</> : <><Send className="h-4 w-4" />{review ? "Обновить отзыв" : "Опубликовать отзыв"}</>}
        </button>
      </div>
    </div>
  );
}

function RatingRow({ label, description, value, onChange, required = false }: { label: string; description: string; value: number; onChange: (value: number) => void; required?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-bold text-foreground">{label}{required && <span className="ml-1 text-red-500">*</span>}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <StarRating value={value} onChange={onChange} size="large" />
    </div>
  );
}

function RatingCard({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-[1.4rem] border border-border bg-background/60 p-5">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="mt-3"><StarRating value={value} onChange={onChange} /></div>
      <p className="mt-2 text-xs text-muted-foreground">{value > 0 ? `${value} из 5` : "Не оценено"}</p>
    </div>
  );
}

function StarRating({ value, onChange, size = "normal" }: { value: number; onChange: (value: number) => void; size?: "normal" | "large" }) {
  const [hovered, setHovered] = useState(0);
  const activeValue = hovered || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="rounded-lg p-1 transition hover:scale-110"
          aria-label={`Оценка ${star}`}
        >
          <Star className={[size === "large" ? "h-8 w-8" : "h-6 w-6", star <= activeValue ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"].join(" ")} />
        </button>
      ))}
    </div>
  );
}
