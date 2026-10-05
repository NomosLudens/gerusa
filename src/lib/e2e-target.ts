const PRODUCTION_HOST = "kallistis.app";

export function validateAuthenticatedE2ETarget(value: string, cloudflareAccount?: string): string {
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error("E2E_BASE_URL deve ser uma URL HTTPS absoluta aprovada.");
  }

  const account = cloudflareAccount?.trim().toLowerCase();
  const accountSuffix =
    account && /^[a-z0-9-]+$/.test(account) ? `.${account}.workers.dev` : undefined;
  const hostname = target.hostname;
  const isApprovedPreview = Boolean(
    accountSuffix &&
    hostname.endsWith(accountSuffix) &&
    (() => {
      const projectHost = hostname.slice(0, -accountSuffix.length);
      return projectHost === "kallistis" || /^[a-z0-9-]+-kallistis$/.test(projectHost);
    })(),
  );

  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.port ||
    target.hash ||
    target.search ||
    target.pathname !== "/" ||
    (hostname !== PRODUCTION_HOST && !isApprovedPreview)
  ) {
    throw new Error("E2E_BASE_URL não aponta para um destino Kallistis aprovado.");
  }

  return target.origin;
}
