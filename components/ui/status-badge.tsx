import type { ComponentProps, ReactNode } from "react"

import { Badge } from "@/components/ui/badge"

export type StatusTone = "success" | "info" | "warning" | "danger" | "neutral"

const statusToneMap: Record<string, StatusTone> = {
  accepted: "success",
  approved: "success",
  completed: "success",
  funded: "success",
  paid: "success",
  published: "info",
  collecting_bids: "info",
  contractor_selected: "info",
  in_progress: "info",
  moderation: "warning",
  pending: "warning",
  awaiting_payment: "warning",
  awaiting_review: "warning",
  awaiting_signature: "warning",
  ready_for_approval: "warning",
  rejected: "danger",
  cancelled: "danger",
  disputed: "danger",
  draft: "neutral",
  withdrawn: "neutral",
  hidden: "neutral",
  expired: "neutral",
}

const badgeVariantByTone = {
  success: "success",
  info: "info",
  warning: "warning",
  danger: "destructive",
  neutral: "neutral",
} as const

export function getStatusTone(status: string | null | undefined): StatusTone {
  return status ? (statusToneMap[status] ?? "neutral") : "neutral"
}

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, "variant"> & {
  status?: string | null
  tone?: StatusTone
  children: ReactNode
}

/** Presentation-only mapping. It never changes a business status value. */
export function StatusBadge({
  status,
  tone,
  children,
  ...props
}: StatusBadgeProps) {
  const resolvedTone = tone ?? getStatusTone(status)

  return (
    <Badge variant={badgeVariantByTone[resolvedTone]} {...props}>
      {children}
    </Badge>
  )
}
