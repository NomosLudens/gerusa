import { useCallback, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { MasterCommandCenter } from "@/components/MasterCommandCenter";
import { useProfile } from "@/lib/use-profile";
import { signOutLocal } from "@/lib/local-auth-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mestre")({ component: MestrePage });

function MestrePage() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const router = useRouter();
  const [selectedMesa, setSelectedMesa] = useState<string | undefined>(() =>
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("mesaId") ?? undefined)
      : undefined,
  );
  const handleMesaChange = useCallback((mesaId: string) => {
    setSelectedMesa(mesaId);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (mesaId) url.searchParams.set("mesaId", mesaId);
    else url.searchParams.delete("mesaId");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);
  async function logout() {
    try {
      await signOutLocal();
      await router.invalidate();
      await navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível sair.");
    }
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#10070b] px-3 py-4 text-[#f5e9df] sm:px-6 sm:py-7">
      <header className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-4 rounded-xl border border-[#742233]/45 bg-[#180b11] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/gerusa-logo.png" alt="" className="h-10 w-10 rounded-full" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-[#d5a56c]">Professora</p>
            <p className="truncate font-medium">{profile?.display_name || "Gerusa"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-11 rounded-lg border border-[#8a3045] px-4 text-sm hover:bg-[#742233]/25"
        >
          Sair
        </button>
      </header>
      <main className="mx-auto max-w-6xl">
        <MasterCommandCenter selectedMesa={selectedMesa} onSelectedMesaChange={handleMesaChange} />
      </main>
    </div>
  );
}
