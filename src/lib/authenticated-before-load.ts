import { redirect } from "@tanstack/react-router";
import { getLocalSession } from "@/lib/local-auth-client";

export async function authenticatedBeforeLoad({ location }: { location: { pathname: string } }) {
  const session = await getLocalSession();
  if (!session?.user) throw redirect({ to: "/auth" });
  const profileResponse = await fetch("/api/profile", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!profileResponse.ok) throw redirect({ to: "/auth" });
  const profile = (await profileResponse.json().catch(() => null)) as {
    is_master?: boolean;
  } | null;
  if (location.pathname.startsWith("/mestre") && !profile?.is_master) {
    throw new Error("Você não tem permissão para acessar esta aplicação.");
  }
}
