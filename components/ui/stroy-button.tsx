import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

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

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-[#5c3b2a] shadow-[0_12px_28px_rgba(107,70,50,0.20)]",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-accent",
  outline:
    "border border-border bg-card text-foreground hover:border-primary/30 hover:bg-secondary/60",
  ghost:
    "bg-transparent text-foreground hover:bg-secondary/70",
  danger:
    "bg-destructive text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 rounded-xl px-4 text-sm",
  md: "min-h-12 rounded-2xl px-5 text-sm",
  lg: "min-h-14 rounded-2xl px-6 text-base",
};

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
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 font-semibold",
        "transition duration-200",
        "focus-visible:outline-none",
        "focus-visible:ring-4 focus-visible:ring-primary/15",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}