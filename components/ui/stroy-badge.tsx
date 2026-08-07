import type { ReactNode } from "react";

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

const variants: Record<Variant, string> = {
  default:
    "bg-secondary text-secondary-foreground",

  success:
    "bg-emerald-50 text-emerald-700",

  warning:
    "bg-amber-50 text-amber-700",

  danger:
    "bg-red-50 text-red-700",

  muted:
    "bg-muted text-muted-foreground",
};

export function StroyBadge({
  children,
  variant = "default",
}: Props) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full",
        "px-3 py-1.5 text-xs font-semibold",
        variants[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}