export function ChatTypingIndicator() {
  return (
    <div className="border-t border-border bg-card px-5 py-3">
      <div className="inline-flex items-center gap-3 rounded-full bg-secondary/70 px-4 py-2">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />

          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />

          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </div>

        <span className="text-xs font-medium text-muted-foreground">
          Собеседник печатает…
        </span>
      </div>
    </div>
  );
}