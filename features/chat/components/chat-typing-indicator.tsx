export function ChatTypingIndicator() {
  return (
    <div className="border-t border-border/70 bg-card/96 px-4 py-2.5 sm:px-5">
      <div className="inline-flex items-center gap-2.5 rounded-full bg-secondary/80 px-3 py-2">
        <div className="flex gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />

          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />

          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </div>

        <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
          Собеседник печатает…
        </span>
      </div>
    </div>
  );
}