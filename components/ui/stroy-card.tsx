import type {
  HTMLAttributes,
  ReactNode,
} from "react";

type Props =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    interactive?: boolean;
  };

export function StroyCard({
  children,
  interactive = false,
  className = "",
  ...props
}: Props) {
  return (
    <div
      className={[
        "rounded-[1.5rem] border border-border bg-card",
        "shadow-[var(--shadow-soft)]",
        interactive
          ? "transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
          : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}