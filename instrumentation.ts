import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { logApplicationError } = await import(
      "./lib/observability/application-errors"
    );

    await logApplicationError({
      source: "server",
      severity: "error",
      message: error.message,
      stack: error.stack ?? null,
      route: request.path,
      method: request.method,
      digest: error.digest ?? null,
      metadata: {
        routerKind: context.routerKind,
        routeType: context.routeType,
        routePath: context.routePath,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
        renderType: context.renderType,
      },
    });
  } catch (loggingError) {
    console.error("Ошибка системного логгера:", loggingError);
  }
};
