"use client";

import Link from "next/link";
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
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const hasUnread =
    notifications.some(
      (item) => !item.is_read
    );

  function handleNotificationClick(
    notification: NotificationItem
  ) {
    onClose();

    if (notification.is_read) {
      return;
    }

    startTransition(async () => {
      const result =
        await readNotification(
          notification.id
        );

      if (!result.success) {
        console.error(
          result.message
        );

        return;
      }

      router.refresh();
    });
  }

  function handleReadAll() {
    startTransition(async () => {
      const result =
        await readAllNotifications();

      if (!result.success) {
        console.error(
          result.message
        );

        return;
      }

      router.refresh();
    });
  }

  return (
    <section className="w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-2xl border bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-900">
            Уведомления
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Последние события
          </p>
        </div>

        {hasUnread && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleReadAll}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50"
          >
            Прочитать все
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-3xl">
            🔔
          </div>

          <p className="mt-3 font-medium text-slate-700">
            Уведомлений пока нет
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Здесь будут появляться
            важные события.
          </p>
        </div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          {notifications.map(
            (item) => (
              <Link
                key={item.id}
                href={
                  item.url ??
                  "/dashboard"
                }
                onClick={() =>
                  handleNotificationClick(
                    item
                  )
                }
                className={
                  item.is_read
                    ? "block border-b p-4 transition hover:bg-slate-50"
                    : "block border-b bg-blue-50 p-4 transition hover:bg-blue-100/60"
                }
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                    {getNotificationIcon(
                      item.notification_type
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>

                      {!item.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>

                    {item.body && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {item.body}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-400">
                      {formatNotificationDate(
                        item.created_at
                      )}
                    </p>
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </section>
  );
}

function getNotificationIcon(
  type: string
) {
  const icons:
    Record<string, string> = {
      new_message: "💬",
      new_bid: "📌",
      bid_accepted: "✅",
      contractor_selected: "🤝",
      stage_completed: "🏗️",
      stage_approved: "✅",
      stage_revision_requested:
        "⚠️",
      file_uploaded: "📎",
      company_verified: "🛡️",
      company_rejected: "❌",
    };

  return icons[type] ?? "🔔";
}

function formatNotificationDate(
  value: string
) {
  const date = new Date(value);

  const now = new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const minutes =
    Math.floor(
      difference / 60_000
    );

  if (minutes < 1) {
    return "Только что";
  }

  if (minutes < 60) {
    return `${minutes} мин. назад`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours} ч. назад`;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}