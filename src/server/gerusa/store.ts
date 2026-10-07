import { Pool } from "pg";

export function createGerusaPool(): Pool {
  const connectionString = process.env.GERUSA_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("gerusa_database_not_configured");

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("gerusa_database_url_invalid");
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.pathname !== "/gerusa" ||
    decodeURIComponent(parsed.username) !== "gerusa" ||
    !parsed.password
  ) {
    throw new Error("gerusa_database_isolation_required");
  }

  return new Pool({
    connectionString,
    application_name: "gerusa",
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 1000,
  });
}

export const THREAD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
