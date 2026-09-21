import type {
  InputHTMLAttributes,
} from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props =
  InputHTMLAttributes<HTMLInputElement>;

export function StroyInput({
  className = "",
  ...props
}: Props) {
  return (
    <Input
      className={cn("min-h-14 px-4", className)}
      {...props}
    />
  );
}
