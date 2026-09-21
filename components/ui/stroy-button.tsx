import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

type Size =
  | "sm"
  | "md"
  | "lg";

type Props =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
  };

const variants = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
} as const;

const sizes = { sm: "sm", md: "default", lg: "lg" } as const;

export function StroyButton({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: Props) {
  return (
    <Button
      type={type}
      variant={variants[variant]}
      size={sizes[size]}
      className={cn(fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </Button>
  );
}
