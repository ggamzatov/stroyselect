import Link from "next/link";

import { requireStaffUser } from
  "@/lib/auth/require-staff-user";

import { LogoutButton } from
  "@/features/auth/components/logout-button";

import { getMyNotifications } from
  "@/features/notifications/queries/get-my-notifications";

import { NotificationPopover } from
  "@/features/notifications/components/notification-popover";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } =
    await requireStaffUser();

  const {
    notifications,
    unreadCount,
  } = await getMyNotifications();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/admin/dashboard"
            className="text-xl font-bold"
          >
            СтройВыбор
          </Link>

          <div className="flex items-center gap-5">
            <NotificationPopover
              userId={user.id}
              notifications={
                notifications
              }
              unreadCount={
                unreadCount
              }
            />

            <span className="text-sm text-slate-600">
              {profile.first_name}
            </span>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border bg-white p-4">
          <nav className="space-y-1">
            <AdminLink
              href="/admin/dashboard"
              label="Обзор"
            />

            <AdminLink
              href="/admin/contractors"
              label="Подрядчики"
            />

            <AdminLink
              href="/admin/projects"
              label="Проекты"
            />

            <AdminLink
              href="/admin/users"
              label="Пользователи"
            />
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}

function AdminLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}