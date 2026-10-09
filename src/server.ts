import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type CloudflareEnv = Record<string, unknown>;

type CloudflareExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type ServerEntry = {
  fetch: (
    request: Request,
    env: CloudflareEnv,
    ctx: CloudflareExecutionContext,
  ) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (key === "Cross-Origin-Resource-Policy" && headers.has("Access-Control-Allow-Origin")) {
      headers.set(key, "same-site");
      continue;
    }
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Structured logging: uma linha JSON por request. Cloudflare Workers
// fazem parse automático e indexam por campo. Mantém o payload pequeno; não loga
// corpos nem headers de auth.
function logRequest(entry: {
  request_id: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  cf_ray?: string | null;
  country?: string | null;
  error?: string;
}) {
  const level = entry.status >= 500 ? "error" : entry.status >= 400 ? "warn" : "info";
  // Endpoints de health são ruidosos — rebaixa pra debug pra não poluir o feed.
  if (entry.path === "/api/public/health" && entry.status < 400) return;
  const line = JSON.stringify({
    level,
    type: "http_request",
    time: new Date().toISOString(),
    ...entry,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function newRequestId(request: Request): string {
  const existing = request.headers.get("x-request-id");
  if (existing && existing.length <= 64) return existing;
  return crypto.randomUUID();
}

// O handler do TanStack Start só recebe `{ request }` nas rotas de API — o
// ExecutionContext real da Cloudflare (com waitUntil) chega aqui em `ctx`, mas
// é descartado ao repassar para `handler.fetch`. O H3Event guarda a MESMA
// referência do Request (não clona), então anexar uma propriedade aqui chega
// intacta em `request` dentro de src/routes/api/*.ts — permite disparar
// trabalho em segundo plano (ex.: sedimentação) sem bloquear a resposta nem
// arriscar o Worker ser encerrado antes do trabalho terminar. Ver
// src/lib/background-task.ts.
function attachCloudflareRuntime(
  request: Request,
  env: CloudflareEnv = {},
  ctx?: CloudflareExecutionContext,
  requestId: string = crypto.randomUUID(),
) {
  if (ctx && typeof ctx.waitUntil === "function") {
    Object.defineProperty(request, "__cfWaitUntil", {
      value: ctx.waitUntil.bind(ctx),
      enumerable: false,
      configurable: true,
    });
  }
  Object.defineProperty(request, "__requestId", {
    value: requestId,
    enumerable: false,
    configurable: true,
  });
}

export default {
  async fetch(request: Request, env: CloudflareEnv = {}, ctx?: CloudflareExecutionContext) {
    const start = Date.now();
    const url = new URL(request.url);
    const request_id = newRequestId(request);
    const cf_ray = request.headers.get("cf-ray");
    const country =
      ((request as Request & { cf?: { country?: string } }).cf?.country as string | undefined) ??
      null;
    const isGerusaConversation =
      /^\/conversa\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        url.pathname,
      );
    const isGerusaApi =
      url.pathname.startsWith("/api/gerusa/") || url.pathname.startsWith("/api/setup/");
    const isGerusaIdentityPage = [
      "/auth",
      "/cadastro",
      "/setup",
      "/home",
      "/mestre",
      "/conversa",
      "/conversa/",
    ].includes(url.pathname);
    const isGerusaIdentityApi = [
      "/api/auth/session",
      "/api/auth/register-teacher",
      "/api/auth/password",
      "/api/auth/recover",
      "/api/profile",
      "/api/master/characters",
      "/api/admin/students",
      "/api/admin/teachers",
      "/api/admin/student-invites",
      "/api/student-invites",
    ].includes(url.pathname);

    let response: Response;
    let errorMessage: string | undefined;
    try {
      if (
        url.pathname !== "/" &&
        !isGerusaConversation &&
        !isGerusaApi &&
        !isGerusaIdentityPage &&
        !isGerusaIdentityApi &&
        url.pathname !== "/gerusa.png" &&
        url.pathname !== "/gerusa-logo.png" &&
        !url.pathname.startsWith("/assets/")
      ) {
        response = new Response("Not found", { status: 404 });
      } else {
        attachCloudflareRuntime(request, env, ctx, request_id);
        const handler = await getServerEntry();
        response = await handler.fetch(request, env, ctx as CloudflareExecutionContext);
        response = await normalizeCatastrophicSsrResponse(response);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          level: "error",
          type: "unhandled_exception",
          time: new Date().toISOString(),
          request_id,
          path: url.pathname,
          method: request.method,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        }),
      );
      response = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const duration_ms = Date.now() - start;

    // Propaga request_id e Server-Timing pra clientes/proxies correlacionarem.
    const headers = new Headers(response.headers);
    headers.set("x-request-id", request_id);
    headers.set("server-timing", `total;dur=${duration_ms}`);
    const stamped = applySecurityHeaders(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
    );

    logRequest({
      request_id,
      method: request.method,
      path: url.pathname,
      status: stamped.status,
      duration_ms,
      cf_ray,
      country,
      error: errorMessage,
    });

    return stamped;
  },
};
