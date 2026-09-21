import type {
  HTMLAttributes,
  ReactNode,
} from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card
      className={cn(
        "gap-0 py-0",
        interactive &&
          "transition-transform hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-elevated)]",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
