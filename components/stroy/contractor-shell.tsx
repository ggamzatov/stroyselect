"use client"

import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  Home,
  Megaphone,
} from "lucide-react"

import { AppShell } from "@/components/layout/app-shell"

type ContractorShellProps = {
  children: React.ReactNode
  profileName: string
  notificationControl: React.ReactNode
  signOutControl: React.ReactNode
}

const navigation = [
  { label: "Главная", href: "/contractor/dashboard", icon: Home },
  { label: "Заказы", href: "/contractor/projects", icon: FolderKanban },
  { label: "Объекты", href: "/contractor/work", icon: BriefcaseBusiness },
]

const secondaryNavigation = [
  { label: "Предложения", href: "/contractor/bids", icon: FileText },
  { label: "Компания", href: "/contractor/company", icon: Building2, exact: true },
  { label: "Верификация", href: "/contractor/company/trust", icon: BadgeCheck },
  { label: "Подписка", href: "/contractor/subscription", icon: CreditCard },
  { label: "Продвижение", href: "/contractor/advertising", icon: Megaphone },
]

/** Compatibility boundary for contractor layouts; AppShell owns all shared UI. */
export function ContractorShell({
  children,
  profileName,
  notificationControl,
  signOutControl,
}: ContractorShellProps) {
  return (
    <AppShell
      homeHref="/contractor/dashboard"
      profileHref="/contractor/company"
      profileName={profileName}
      profileLabel="Подрядчик"
      navigation={navigation}
      secondaryNavigation={secondaryNavigation}
      mobileNavigation={navigation.slice(0, 2)}
      primaryAction={{ href: "/contractor/projects", label: "Найти заказ" }}
      searchAction={{
        href: "/contractor/projects",
        label: "Поиск заказов, объектов и специализаций…",
        ariaLabel: "Перейти к поиску новых заказов",
      }}
      notificationControl={notificationControl}
      signOutControl={signOutControl}
    >
      {children}
    </AppShell>
  )
}
