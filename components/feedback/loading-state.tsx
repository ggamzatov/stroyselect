import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type LoadingStateProps = {
  label?: string
  className?: string
}

export function LoadingState({ label = "Загрузка", className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-live="polite" aria-label={label}>
      <Skeleton className="h-8 w-1/3 max-w-56" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
