import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

type Props = {
  unreadCount: number;
  projectTitle: string;
  counterpartName: string;
  backHref: string;
};

export function ChatHeader({
  unreadCount,
  projectTitle,
  counterpartName,
  backHref,
}: Props) {
  return (
    <div className="flex min-h-[72px] items-center justify-between gap-3 border-b border-border bg-card px-3 py-3 sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <Link
          href={backHref}
          aria-label="Вернуться к проекту"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary sm:h-11 sm:w-11">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-[-0.01em] text-foreground sm:text-base">
            {projectTitle}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
            Диалог с {counterpartName}
          </p>
        </div>
      </div>

      {unreadCount > 0 && (
        <div
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground sm:px-3 sm:text-xs"
          aria-label={`Непрочитанных сообщений: ${unreadCount}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
          {unreadCount}
          <span className="hidden sm:inline">{formatUnreadWord(unreadCount)}</span>
        </div>
      )}
    </div>
  );
}

function formatUnreadWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return "новых";
  }

  if (last === 1) {
    return "новое";
  }

  return "новых";
}
