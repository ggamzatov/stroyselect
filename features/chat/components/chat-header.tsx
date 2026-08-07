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
    <div className="flex flex-col gap-4 border-b border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-bold text-foreground">
            Чат проекта
          </p>

          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />

            <span>
              Заказчик ↔ Подрядчик
            </span>
          </div>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          <span className="h-2 w-2 rounded-full bg-white" />

          {unreadCount}{" "}
          {formatUnreadWord(
            unreadCount
          )}
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