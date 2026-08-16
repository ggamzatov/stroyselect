import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const {
      logApplicationError,
      resolveErrorUserIdFromCookieHeader,
    } = await import("./lib/observability/application-errors");

    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            typeof error === "string"
              ? error
              : "Неизвестная ошибка запроса"
          );

    const digest =
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string"
        ? (error as { digest: string }).digest
        : null;

    const userId = await resolveErrorUserIdFromCookieHeader(
      request.headers.cookie
    );
    const userAgent = Array.isArray(request.headers["user-agent"])
      ? request.headers["user-agent"].join(" ")
      : request.headers["user-agent"] ?? null;

    await logApplicationError({
      userId,
      source: "server",
      severity: "error",
      message: normalizedError.message,
      stack: normalizedError.stack ?? null,
      route: request.path,
      method: request.method,
      digest,
      userAgent,
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
