import type { ComponentProps, ReactNode } from "react"

import { ContentContainer } from "@/components/layout/content-container"
import { cn } from "@/lib/utils"

type PageFrameProps = ComponentProps<"main"> & {
  children: ReactNode
  size?: "default" | "wide" | "narrow"
}

/** Consistent page width and responsive breathing room for application pages. */
export function PageFrame({
  className,
  children,
  size = "default",
  ...props
}: PageFrameProps) {
  return (
    <main className={cn("px-4 py-6 sm:px-6 sm:py-8 lg:px-8", className)} {...props}>
      <ContentContainer size={size}>{children}</ContentContainer>
    </main>
  )
}
