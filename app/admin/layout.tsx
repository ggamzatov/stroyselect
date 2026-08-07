import { requireStaffUser } from
  "@/lib/auth/require-staff-user";

import { getMyNotifications } from
  "@/features/notifications/queries/get-my-notifications";

import { AdminHeader } from
  "@/features/admin/components/admin-header";

import { AdminSidebar } from
  "@/features/admin/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    profile,
  } =
    await requireStaffUser();

  const {
    notifications,
    unreadCount,
  } =
    await getMyNotifications();

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        userId={user.id}
        firstName={
          profile.first_name
        }
        lastName={
          profile.last_name
        }
        notifications={
          notifications
        }
        unreadCount={
          unreadCount
        }
      />

      <div className="app-container py-6 md:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          <AdminSidebar />

          <main className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}