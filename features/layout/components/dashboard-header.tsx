import Link from "next/link";

import { createClient } from
  "@/lib/supabase/server";

import { getMyNotifications } from
  "@/features/notifications/queries/get-my-notifications";

import { NotificationPopover } from
  "@/features/notifications/components/notification-popover";

type Props = {
  title?: string;
};

export async function DashboardHeader({
  title = "StroySelect",
}: Props) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    notifications,
    unreadCount,
  } = await getMyNotifications();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-slate-900"
          >
            {title}
          </Link>

          <nav className="hidden items-center gap-4 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Главная
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationPopover
            userId={user.id}
            notifications={
              notifications
            }
            unreadCount={
              unreadCount
            }
          />

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
            {getUserInitial(
              user.email
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function getUserInitial(
  email?: string
) {
  if (!email) {
    return "П";
  }

  return email
    .charAt(0)
    .toUpperCase();
}