"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/errors/client", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message || "Критическая ошибка приложения",
        stack: error.stack ?? null,
        digest: error.digest ?? null,
        route: window.location.pathname,
        metadata: { boundary: "app/global-error" },
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 560, textAlign: "center" }}>
            <h1>Произошла техническая ошибка</h1>
            <p>Мы записали её для администратора. Попробуйте перезагрузить интерфейс.</p>
            <button type="button" onClick={reset} style={{ padding: "12px 18px", cursor: "pointer" }}>Повторить</button>
            {error.digest ? <p style={{ fontSize: 12, opacity: 0.65 }}>Код ошибки: {error.digest}</p> : null}
          </div>
        </main>
      </body>
    </html>
  );
}
