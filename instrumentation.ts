import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (context.runtime !== "nodejs") return;

  try {
    const { logApplicationError } = await import(
      "./lib/observability/application-errors"
    );

    const normalized = error instanceof Error
      ? error
      : new Error(String(error));

    await logApplicationError({
      source: "server",
      severity: "error",
      message: normalized.message,
      stack: normalized.stack ?? null,
      route: request.path,
      method: request.method,
      digest:
        typeof (error as { digest?: unknown })?.digest === "string"
          ? (error as { digest: string }).digest
          : null,
      metadata: {
        routerKind: context.routerKind,
        routeType: context.routeType,
        routePath: context.routePath,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
      },
    });
  } catch (loggingError) {
    console.error("Ошибка системного логгера:", loggingError);
  }
};
