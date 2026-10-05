const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSafeHttpMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

export function isSameOriginRequest(request: Request, expectedOrigin: string): boolean {
  const allowedOrigins = expectedOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (isSafeHttpMethod(request.method)) return true;
  const origin = request.headers.get("origin");
  if (origin) return allowedOrigins.includes(origin);
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return allowedOrigins.includes(new URL(referer).origin);
  } catch {
    return false;
  }
}
