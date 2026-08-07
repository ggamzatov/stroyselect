"use client";

import Link from "next/link";

import {
  Bell,
  CheckCheck,
  CheckCircle2,
  FileText,
  MessageSquareText,
  Pin,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

import {
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import { readNotification } from
  "@/features/notifications/actions/read-notification";

import { readAllNotifications } from
  "@/features/notifications/actions/read-all-notifications";

import type { NotificationItem } from
  "@/features/notifications/types";

type Props = {
  notifications:
    NotificationItem[];

  onClose: () => void;
};

export function NotificationDropdown({
  notifications,
  onClose,
}: Props) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const hasUnread =
    notifications.some(
      (item) =>
        !item.is_read
    );

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.is_read
    ).length;

  function handleNotificationClick(
    notification:
      NotificationItem
  ) {
    onClose();

    if (
      notification.is_read
    ) {
      return;
    }

    startTransition(
      async () => {
        const result =
          await readNotification(
            notification.id
          );

        if (
          !result.success
        ) {
          console.error(
            result.message
          );

          return;
        }

        router.refresh();
      }
    );
  }

  function handleReadAll() {
    startTransition(
      async () => {
        const result =
          await readAllNotifications();

        if (
          !result.success
        ) {
          console.error(
            result.message
          );

          return;
        }

        router.refresh();
      }
    );
  }

  return (
    <section className="w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_24px_70px_rgba(55,35,24,0.18)]">
      {/* Верх */}

      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold tracking-tight text-foreground">
                  Уведомления
                </h2>

                {unreadCount > 0 && (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Последние события
                вашего аккаунта
              </p>
            </div>
          </div>

          {hasUnread && (
            <button
              type="button"
              disabled={
                isPending
              }
              onClick={
                handleReadAll
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition hover:bg-secondary disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />

              <span className="hidden sm:inline">
                Прочитать все
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Список */}

      {notifications.length ===
      0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-secondary text-primary">
            <Bell className="h-6 w-6" />
          </div>

          <h3 className="mt-4 font-bold text-foreground">
            Уведомлений пока нет
          </h3>

          <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-muted-foreground">
            Здесь будут появляться
            сообщения, предложения,
            файлы и другие важные
            события.
          </p>
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto overscroll-contain">
          {notifications.map(
            (item) => {
              const config =
                getNotificationConfig(
                  item.notification_type
                );

              return (
                <Link
                  key={
                    item.id
                  }
                  href={
                    item.url ??
                    "/dashboard"
                  }
                  onClick={() =>
                    handleNotificationClick(
                      item
                    )
                  }
                  className={[
                    "group relative block border-b border-border px-5 py-4 transition last:border-b-0",

                    item.is_read
                      ? "bg-card hover:bg-secondary/30"
                      : "bg-secondary/45 hover:bg-secondary/70",
                  ].join(" ")}
                >
                  {/* Индикатор непрочитанного */}

                  {!item.is_read && (
                    <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-primary" />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Иконка */}

                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition",
                        config.className,
                      ].join(" ")}
                    >
                      {
                        config.icon
                      }
                    </div>

                    {/* Текст */}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={[
                            "min-w-0 text-sm leading-5 text-foreground",

                            item.is_read
                              ? "font-semibold"
                              : "font-bold",
                          ].join(" ")}
                        >
                          {
                            item.title
                          }
                        </p>

                        {!item.is_read && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                            aria-label="Непрочитанное уведомление"
                          />
                        )}
                      </div>

                      {item.body && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
                          {
                            item.body
                          }
                        </p>
                      )}

                      <p className="mt-2.5 text-[11px] font-medium text-muted-foreground/70">
                        {formatNotificationDate(
                          item.created_at
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

function getNotificationConfig(
  type: string
) {
  switch (type) {
    case "new_message":
      return {
        icon: (
          <MessageSquareText className="h-4 w-4" />
        ),

        className:
          "border-primary/10 bg-secondary text-primary",
      };

    case "new_bid":
      return {
        icon: (
          <Pin className="h-4 w-4" />
        ),

        className:
          "border-primary/10 bg-secondary text-primary",
      };

    case "bid_accepted":
      return {
        icon: (
          <CheckCircle2 className="h-4 w-4" />
        ),

        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
      };

    case "contractor_selected":
      return {
        icon: (
          <UserRoundCheck className="h-4 w-4" />
        ),

        className:
          "border-primary/10 bg-secondary text-primary",
      };

    case "stage_completed":
      return {
        icon: (
          <CheckCircle2 className="h-4 w-4" />
        ),

        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
      };

    case "stage_approved":
      return {
        icon: (
          <CheckCircle2 className="h-4 w-4" />
        ),

        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
      };

    case "stage_revision_requested":
      return {
        icon: (
          <TriangleAlert className="h-4 w-4" />
        ),

        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
      };

    case "file_uploaded":
      return {
        icon: (
          <FileText className="h-4 w-4" />
        ),

        className:
          "border-primary/10 bg-secondary text-primary",
      };

    case "company_verified":
      return {
        icon: (
          <ShieldCheck className="h-4 w-4" />
        ),

        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
      };

    case "company_rejected":
      return {
        icon: (
          <XCircle className="h-4 w-4" />
        ),

        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
      };

    default:
      return {
        icon: (
          <Bell className="h-4 w-4" />
        ),

        className:
          "border-border bg-secondary/60 text-primary",
      };
  }
}

function formatNotificationDate(
  value: string
) {
  const date =
    new Date(value);

  const now =
    new Date();

  const difference =
    Math.max(
      0,
      now.getTime() -
        date.getTime()
    );

  const minutes =
    Math.floor(
      difference /
        60_000
    );

  if (
    minutes < 1
  ) {
    return "Только что";
  }

  if (
    minutes < 60
  ) {
    return `${minutes} мин. назад`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (
    hours < 24
  ) {
    return `${hours} ч. назад`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (
    days < 7
  ) {
    return `${days} ${formatDays(days)} назад`;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "numeric",
      month: "short",
      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    }
  ).format(date);
}

function formatDays(
  value: number
) {
  const lastTwo =
    value % 100;

  const last =
    value % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "дней";
  }

  if (
    last === 1
  ) {
    return "день";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "дня";
  }

  return "дней";
}