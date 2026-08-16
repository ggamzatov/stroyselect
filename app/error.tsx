"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/errors/client", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message || "Неизвестная ошибка интерфейса",
        stack: error.stack ?? null,
        digest: error.digest ?? null,
        route: window.location.pathname,
        metadata: { boundary: "app/error" },
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="min-h-[60vh] bg-background px-4 py-16">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"><AlertTriangle className="h-6 w-6" /></div>
        <h1 className="mt-5 text-2xl font-black text-foreground">Не удалось загрузить этот раздел</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Ошибка уже отправлена в журнал администратора. Попробуйте повторить действие; ваши сохранённые данные не удаляются.</p>
        <button type="button" onClick={reset} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"><RefreshCw className="h-4 w-4" />Попробовать снова</button>
        {error.digest && <p className="mt-4 text-[11px] text-muted-foreground">Код ошибки: {error.digest}</p>}
      </section>
    </main>
  );
}
