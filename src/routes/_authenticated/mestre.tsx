import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CharacterReviewQueue } from "@/components/CharacterReviewQueue";
import { MasterSheetsPanel } from "@/components/MasterSheetsPanel";
import { MasterCommandCenter } from "@/components/MasterCommandCenter";
import { MasterOperationalRail } from "@/components/MasterOperationalRail";
import { CampaignContinuityManager } from "@/components/CampaignContinuityManager";
import { MesaLiveSessionPanel } from "@/components/MesaLiveSessionPanel";
import { MasterAdministrationPanel } from "@/components/MasterAdministrationPanel";
import { useProfile } from "@/lib/use-profile";

export const Route = createFileRoute("/_authenticated/mestre")({ component: MestrePage });

function MestrePage() {
  const { isSystemMaster } = useProfile();
  const [selectedMesa, setSelectedMesa] = useState<string | undefined>(() =>
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("mesaId") ?? undefined)
      : undefined,
  );
  const handleMesaChange = useCallback((mesaId: string) => {
    setSelectedMesa(mesaId);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (mesaId && mesaId !== "all") url.searchParams.set("mesaId", mesaId);
    else url.searchParams.delete("mesaId");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);
  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-3 py-4 sm:px-4 sm:py-6 lg:flex-row lg:items-start lg:gap-10 lg:px-8 lg:py-8">
        <main className="min-w-0 flex-1">
          <MasterCommandCenter
            selectedMesa={selectedMesa}
            onSelectedMesaChange={handleMesaChange}
          />
          <MesaLiveSessionPanel mesaId={selectedMesa} />
          <CampaignContinuityManager selectedMesa={selectedMesa} />
          <CharacterReviewQueue />
          <MasterSheetsPanel
            selectedMesa={selectedMesa}
            onSelectedMesaChange={handleMesaChange}
            hideMesaSelector
          />
          <MasterAdministrationPanel isSystemMaster={isSystemMaster} />
        </main>
        <MasterOperationalRail
          mesaId={selectedMesa && selectedMesa !== "all" ? selectedMesa : null}
        />
      </div>
    </>
  );
}
