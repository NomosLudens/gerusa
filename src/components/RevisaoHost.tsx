import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MicroappHost } from "@/components/microapps/MicroappHost";
import { REVISAO_MICROAPP_ACTIONS } from "@/components/microapps/microapp-events";
import type { MicroappEvent } from "@/components/microapps/microapp-types";
import { dueMemorias, reviewMemoria } from "@/lib/jardim.functions";
import {
  approveMemoryCandidate,
  archiveMemoryCandidate,
  listMemoryCandidates,
  rejectMemoryCandidate,
} from "@/lib/memory-review.functions";

type HostMessage = {
  source: "kallistis-host";
  action: string;
  payload?: unknown;
  timestamp: number;
};

function post(frame: HTMLIFrameElement | null, action: string, payload?: unknown) {
  frame?.contentWindow?.postMessage(
    { source: "kallistis-host", action, payload, timestamp: Date.now() } satisfies HostMessage,
    window.location.origin,
  );
}

function record(payload: unknown) {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function quality(value: unknown): 0 | 1 | 2 | 3 {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : 2;
}

export function RevisaoHost() {
  const listCandidatesFn = useServerFn(listMemoryCandidates);
  const approveCandidateFn = useServerFn(approveMemoryCandidate);
  const rejectCandidateFn = useServerFn(rejectMemoryCandidate);
  const archiveCandidateFn = useServerFn(archiveMemoryCandidate);
  const listDueFn = useServerFn(dueMemorias);
  const reviewMemoriaFn = useServerFn(reviewMemoria);

  const handleEvent = useCallback(
    (event: MicroappEvent, frame: HTMLIFrameElement | null) => {
      if (event.source !== "revisao") return;

      void (async () => {
        try {
          const payload = record(event.payload);

          async function refreshCandidatos() {
            const candidatos = await listCandidatesFn({ data: { status: "pending", limit: 100 } });
            post(frame, "revisao:candidatos-ready", { candidatos });
          }

          if (event.action === "revisao:candidatos-request") {
            await refreshCandidatos();
            return;
          }

          if (event.action === "revisao:candidato-aprovar") {
            await approveCandidateFn({ data: { id: str(payload.id) } });
            await refreshCandidatos();
            toast.success("Candidato aprovado");
            return;
          }

          if (event.action === "revisao:candidato-aprovar-editado") {
            await approveCandidateFn({
              data: {
                id: str(payload.id),
                title: str(payload.title),
                content: str(payload.content),
                domain: payload.domain as never,
                sensitivity: payload.sensitivity as never,
              },
            });
            await refreshCandidatos();
            toast.success("Candidato aprovado");
            return;
          }

          if (event.action === "revisao:candidato-recusar") {
            await rejectCandidateFn({ data: { id: str(payload.id) } });
            await refreshCandidatos();
            return;
          }

          if (event.action === "revisao:candidato-arquivar") {
            await archiveCandidateFn({ data: { id: str(payload.id) } });
            await refreshCandidatos();
            return;
          }

          if (event.action === "revisao:due-request") {
            const due = await listDueFn({ data: { limit: 50 } });
            post(frame, "revisao:due-ready", { due });
            return;
          }

          if (event.action === "revisao:memoria-revisar") {
            await reviewMemoriaFn({
              data: { id: str(payload.id), quality: quality(payload.quality) },
            });
            post(frame, "revisao:memoria-revisada", { id: str(payload.id) });
            return;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha na Revisão.";
          post(frame, "revisao:error", { message });
          toast.error(message);
        }
      })();
    },
    [
      approveCandidateFn,
      archiveCandidateFn,
      listCandidatesFn,
      listDueFn,
      rejectCandidateFn,
      reviewMemoriaFn,
    ],
  );

  return (
    <MicroappHost
      appId="revisao"
      title="Revisão"
      expectedSource="revisao"
      allowedActions={REVISAO_MICROAPP_ACTIONS}
      loadingLabel="Abrindo Revisão..."
      onEvent={handleEvent}
    />
  );
}
