import type {
  InputHTMLAttributes,
} from "react";

type Props =
  InputHTMLAttributes<HTMLInputElement>;

export function StroyInput({
  className = "",
  ...props
}: Props) {
  return (
    <input
      className={[
        "min-h-14 w-full rounded-2xl",
        "border border-input bg-card",
        "px-4 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "outline-none transition",
        "focus:border-primary/50",
        "focus:ring-4 focus:ring-primary/10",
        className,
      ].join(" ")}
      {...props}
    />
  );
}