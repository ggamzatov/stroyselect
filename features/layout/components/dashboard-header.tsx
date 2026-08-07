import Link from "next/link";

import {
  BriefcaseBusiness,
  Building2,
  FileText,
  FolderKanban,
  Home,
  UserRound,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { SignOutButton } from
  "@/features/auth/components/sign-out-button";

import { getMyNotifications } from
  "@/features/notifications/queries/get-my-notifications";

import { NotificationCenter } from
  "@/features/notifications/components/notification-center";

export async function DashboardHeader() {
  const [
    currentProfile,
    notificationData,
  ] =
    await Promise.all([
      getCurrentProfile(),
      getMyNotifications(),
    ]);

  const { profile } =
    currentProfile;

  const isCustomer =
    profile.role ===
    "customer";

  const dashboardHref =
    isCustomer
      ? "/customer/dashboard"
      : "/contractor/dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="app-container">
        <div className="flex min-h-18 items-center justify-between gap-4">
          {/* Левая часть */}

          <div className="flex min-w-0 items-center gap-6">
            <Link
              href={dashboardHref}
              className="shrink-0 text-xl font-black tracking-[-0.045em] text-foreground"
            >
              СтройВыбор
            </Link>

            {/* Desktop navigation */}

            <nav className="hidden items-center gap-1 lg:flex">
              {isCustomer ? (
                <>
                  <NavItem
                    href="/customer/dashboard"
                    icon={
                      <Home className="h-4 w-4" />
                    }
                  >
                    Кабинет
                  </NavItem>

                  <NavItem
                    href="/customer/projects"
                    icon={
                      <FolderKanban className="h-4 w-4" />
                    }
                  >
                    Мои проекты
                  </NavItem>

                  <NavItem
                    href="/customer/bids"
                    icon={
                      <FileText className="h-4 w-4" />
                    }
                  >
                    Предложения
                  </NavItem>
                </>
              ) : (
                <>
                  <NavItem
                    href="/contractor/dashboard"
                    icon={
                      <Home className="h-4 w-4" />
                    }
                  >
                    Кабинет
                  </NavItem>

                  <NavItem
                    href="/contractor/projects"
                    icon={
                      <FolderKanban className="h-4 w-4" />
                    }
                  >
                    Проекты
                  </NavItem>

                  <NavItem
                    href="/contractor/bids"
                    icon={
                      <FileText className="h-4 w-4" />
                    }
                  >
                    Предложения
                  </NavItem>

                  <NavItem
                    href="/contractor/work"
                    icon={
                      <BriefcaseBusiness className="h-4 w-4" />
                    }
                  >
                    Мои объекты
                  </NavItem>

                  <NavItem
                    href="/contractor/company"
                    icon={
                      <Building2 className="h-4 w-4" />
                    }
                  >
                    Компания
                  </NavItem>
                </>
              )}
            </nav>
          </div>

          {/* Правая часть */}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Уведомления */}

            <NotificationCenter
              notifications={
                notificationData.notifications
              }
              unreadCount={
                notificationData.unreadCount
              }
            />

            {/* Профиль */}

            <Link
              href={dashboardHref}
              className="hidden items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-secondary/60 md:flex"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary">
                <UserRound className="h-4 w-4" />
              </span>

              <div className="max-w-40 text-left">
                <p className="truncate text-sm font-semibold text-foreground">
                  {getProfileName(
                    profile.first_name,
                    profile.last_name
                  )}
                </p>

                <p className="text-xs text-muted-foreground">
                  {isCustomer
                    ? "Заказчик"
                    : "Подрядчик"}
                </p>
              </div>
            </Link>

            {/* Выход */}

            <SignOutButton />
          </div>
        </div>

        {/* Mobile navigation */}

        <nav className="flex gap-2 overflow-x-auto border-t border-border py-2 lg:hidden">
          {isCustomer ? (
            <>
              <MobileNavItem
                href="/customer/dashboard"
              >
                Кабинет
              </MobileNavItem>

              <MobileNavItem
                href="/customer/projects"
              >
                Проекты
              </MobileNavItem>

              <MobileNavItem
                href="/customer/bids"
              >
                Предложения
              </MobileNavItem>
            </>
          ) : (
            <>
              <MobileNavItem
                href="/contractor/dashboard"
              >
                Кабинет
              </MobileNavItem>

              <MobileNavItem
                href="/contractor/projects"
              >
                Проекты
              </MobileNavItem>

              <MobileNavItem
                href="/contractor/bids"
              >
                Предложения
              </MobileNavItem>

              <MobileNavItem
                href="/contractor/work"
              >
                Объекты
              </MobileNavItem>

              <MobileNavItem
                href="/contractor/company"
              >
                Компания
              </MobileNavItem>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
    >
      <span className="text-primary">
        {icon}
      </span>

      {children}
    </Link>
  );
}

function MobileNavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-secondary/50 px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
    >
      {children}
    </Link>
  );
}

function getProfileName(
  firstName: string | null,
  lastName: string | null
) {
  const name = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    name ||
    "Пользователь"
  );
}