import {
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

export function EmptyChat() {
  return (
    <div className="flex min-h-[360px] items-center justify-center px-5 text-center sm:min-h-[420px] sm:px-6">
      <div className="max-w-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary shadow-sm sm:h-16 sm:w-16">
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </div>

        <h3 className="mt-5 text-lg font-black tracking-[-0.02em] text-foreground">
          Начните обсуждение проекта
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Сообщения, файлы и ответы по объекту будут храниться здесь в одной ленте.
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Только участники проекта
        </div>
      </div>
    </div>
  );
}