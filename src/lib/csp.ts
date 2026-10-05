// Content-Security-Policy + security headers para o servidor TanStack.
// Aplicado via requestMiddleware em src/start.ts.
// Hosts permitidos: same-origin para tudo, backend/realtime,
// OpenRouter para IA, blob/data: para mídias geradas.
import { getRuntimeEnv } from "@/server/runtime/context";

function getSupabaseOrigins() {
  const supabaseUrl = getRuntimeEnv().supabaseUrl ?? "";
  try {
    const origin = supabaseUrl ? new URL(supabaseUrl).origin : "";
    return {
      origin,
      ws: origin.replace(/^http/, "ws"),
    };
  } catch {
    return { origin: "", ws: "" };
  }
}

function buildSecurityHeaders(): Record<string, string> {
  const { origin: supabaseOrigin, ws: supabaseWs } = getSupabaseOrigins();

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://accounts.google.com",
      "https://apis.google.com",
      "https://static.cloudflareinsights.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'", "blob:", "data:"],
    "connect-src": [
      "'self'",
      supabaseOrigin,
      supabaseWs,
      "https://openrouter.ai",
      "https://accounts.google.com",
      "https://www.googleapis.com",
    ].filter(Boolean),
    "frame-src": [
      "'self'",
      "https://",
      "https://accounts.google.com",
      "https://content.googleapis.com",
      "https://docs.google.com",
    ],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };

  const csp = Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()",
    "X-XSS-Protection": "0",
  };
}

export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  const securityHeaders = buildSecurityHeaders();
  for (const [k, v] of Object.entries(securityHeaders)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
