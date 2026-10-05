type ClientErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  console.error("[client-error]", {
    error,
    context: {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    options: {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    } satisfies ClientErrorOptions,
  });
}
