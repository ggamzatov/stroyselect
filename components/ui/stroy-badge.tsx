import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

type Variant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "muted";

type Props = {
  children: ReactNode;
  variant?: Variant;
};

const variants = {
  default: "secondary",
  success: "success",
  warning: "warning",
  danger: "destructive",
  muted: "neutral",
} as const;

export function StroyBadge({
  children,
  variant = "default",
}: Props) {
  return (
    <Badge variant={variants[variant]}>
      {children}
    </Badge>
  );
}
