import {
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

type Props = {
  unreadCount: number;
};

export function ChatHeader({
  unreadCount,
}: Props) {
  return (
    <div className="flex min-h-[68px] items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary sm:h-11 sm:w-11">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-[-0.01em] text-foreground sm:text-base">
            Чат проекта
          </p>

          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">
              Защищённое общение заказчика и подрядчика
            </span>
          </div>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground sm:px-3 sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />

          {unreadCount}{" "}
          <span className="hidden sm:inline">
            {formatUnreadWord(
              unreadCount
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function formatUnreadWord(
  count: number
) {
  const lastTwo =
    count % 100;

  const last =
    count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "новых";
  }

  if (last === 1) {
    return "новое";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "новых";
  }

  return "новых";
}