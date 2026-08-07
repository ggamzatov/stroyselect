// components/stroy/bid-card.tsx

import {
  CalendarDays,
  Clock3,
  Wallet,
} from "lucide-react";

import { StroyCard } from "@/components/ui/stroy-card";
import { StroyButton } from "@/components/ui/stroy-button";

type Props = {
  contractorName: string;
  amount: string;
  duration?: string | null;
  message?: string | null;
  createdAt?: string | null;
};

export function BidCard({
  contractorName,
  amount,
  duration,
  message,
  createdAt,
}: Props) {
  return (
    <StroyCard className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Подрядчик
          </p>

          <h3 className="mt-1 text-xl font-bold text-foreground">
            {contractorName}
          </h3>
        </div>

        <div className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
          Новое предложение
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-secondary/60 p-4">
          <Wallet className="h-5 w-5 text-primary" />

          <p className="mt-3 text-xs text-muted-foreground">
            Стоимость
          </p>

          <p className="mt-1 font-bold">
            {amount}
          </p>
        </div>

        {duration && (
          <div className="rounded-2xl bg-secondary/60 p-4">
            <Clock3 className="h-5 w-5 text-primary" />

            <p className="mt-3 text-xs text-muted-foreground">
              Срок
            </p>

            <p className="mt-1 font-bold">
              {duration}
            </p>
          </div>
        )}

        {createdAt && (
          <div className="rounded-2xl bg-secondary/60 p-4">
            <CalendarDays className="h-5 w-5 text-primary" />

            <p className="mt-3 text-xs text-muted-foreground">
              Получено
            </p>

            <p className="mt-1 font-bold">
              {createdAt}
            </p>
          </div>
        )}
      </div>

      {message && (
        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <StroyButton>
          Рассмотреть
        </StroyButton>

        <StroyButton variant="outline">
          Профиль подрядчика
        </StroyButton>
      </div>
    </StroyCard>
  );
}