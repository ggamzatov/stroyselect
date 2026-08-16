"use client";

import { useEffect } from "react";

function report(payload: Record<string, unknown>) {
  void fetch("/api/errors/client", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      report({
        message: event.message || "Client error",
        stack: event.error instanceof Error ? event.error.stack ?? null : null,
        route: window.location.pathname + window.location.search,
        metadata: {
          filename: event.filename || null,
          lineno: event.lineno || null,
          colno: event.colno || null,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report({
        message: reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection"),
        stack: reason instanceof Error ? reason.stack ?? null : null,
        route: window.location.pathname + window.location.search,
        metadata: { kind: "unhandledrejection" },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
