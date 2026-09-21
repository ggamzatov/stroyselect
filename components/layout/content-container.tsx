import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type ContentContainerProps = ComponentProps<"div"> & {
  size?: "default" | "wide" | "narrow"
}

export function ContentContainer({
  className,
  size = "default",
  ...props
}: ContentContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        size === "default" && "max-w-7xl",
        size === "wide" && "max-w-[90rem]",
        size === "narrow" && "max-w-3xl",
        className
      )}
      {...props}
    />
  )
}
