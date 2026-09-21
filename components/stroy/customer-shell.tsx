"use client"

import { Bell, FileText, FolderKanban, HardHat, Home } from "lucide-react"

import { AppShell } from "@/components/layout/app-shell"

type CustomerShellProps = {
  children: React.ReactNode
  profileName: string
  notificationControl: React.ReactNode
  signOutControl: React.ReactNode
}

const navigation = [
  { label: "Главная", href: "/customer/dashboard", icon: Home },
  { label: "Проекты", href: "/customer/projects", icon: FolderKanban },
  { label: "Специалисты", href: "/customer/contractors", icon: HardHat },
]

const secondaryNavigation = [
  { label: "Предложения", href: "/customer/bids", icon: FileText },
  { label: "Уведомления", href: "/notification-settings", icon: Bell },
]

/** Compatibility boundary for customer layouts; AppShell owns all shared UI. */
export function CustomerShell({
  children,
  profileName,
  notificationControl,
  signOutControl,
}: CustomerShellProps) {
  return (
    <AppShell
      homeHref="/customer/dashboard"
      profileHref="/notification-settings"
      profileName={profileName}
      profileLabel="Заказчик"
      navigation={navigation}
      secondaryNavigation={secondaryNavigation}
      mobileNavigation={navigation.slice(0, 2)}
      primaryAction={{ href: "/customer/projects/new", label: "Создать задачу" }}
      searchAction={{
        href: "/customer/contractors",
        label: "Поиск услуг, специалистов, подрядчиков…",
        ariaLabel: "Перейти к поиску специалистов",
      }}
      notificationControl={notificationControl}
      signOutControl={signOutControl}
    >
      {children}
    </AppShell>
  )
}
