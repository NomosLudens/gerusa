type CoreResponse<T> = T & { error?: string };

export async function gerusaCoreRequest<T>(
  path: string,
  init: RequestInit = {},
  sessionToken?: string | null,
): Promise<T> {
  const configuredUrl = process.env.GERUSA_CORE_URL?.trim();
  const secret = process.env.GERUSA_CORE_SECRET;
  if (!configuredUrl || !secret) throw new Error("gerusa_core_not_configured");

  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredUrl);
  } catch {
    throw new Error("gerusa_core_url_invalid");
  }
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error("gerusa_core_https_required");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${secret}`);
  if (sessionToken) headers.set("X-Gerusa-Session", sessionToken);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`gerusa_core_http_${response.status}`);
  return (await response.json()) as CoreResponse<T>;
}

export const THREAD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
