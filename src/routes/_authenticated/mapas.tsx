import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mapas")({ component: MapasPage });

function MapasPage() {
  return (
    <main className="h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden bg-[#08080E]">
      <iframe
        title="Atlas cartográfico de KALLISTIS"
        src="/api/master/surface/mapa"
        className="h-full w-full border-0"
      />
    </main>
  );
}
