import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders } from "./lib/csp";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// CSP + headers de segurança em TODA resposta. Mantém o fluxo de erro intacto.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const res = await next();
  // `next()` retorna o objeto Response em rotas/SSR; aplica headers idempotentes.
  if (res instanceof Response) return applySecurityHeaders(res);
  return res;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [],
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware],
}));
