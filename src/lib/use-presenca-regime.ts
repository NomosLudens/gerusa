import { useCallback, useEffect, useState } from "react";
import { resolveMesaSelection, type PresenceMesa } from "@/lib/presence-ui";
import { usePolling } from "@/lib/use-polling";

export type PresencaState = "green" | "yellow" | "blue" | "red";
export const PRESENCA_META = {
  green: {
    label: "Verde",
    short: "Verde",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/40",
    chip: "border-emerald-500/60 text-emerald-200 bg-emerald-500/10",
    glow: "shadow-[0_0_6px_rgba(16,185,129,0.7)]",
  },
  yellow: {
    label: "Amarelo",
    short: "Amarelo",
    dot: "bg-amber-400",
    ring: "ring-amber-400/40",
    chip: "border-amber-400/60 text-amber-100 bg-amber-400/10",
    glow: "shadow-[0_0_6px_rgba(251,191,36,0.7)]",
  },
  blue: {
    label: "Azul",
    short: "Azul",
    dot: "bg-sky-400",
    ring: "ring-sky-400/40",
    chip: "border-sky-400/60 text-sky-100 bg-sky-400/10",
    glow: "shadow-[0_0_6px_rgba(56,189,129,0.7)]",
  },
  red: {
    label: "Vermelho",
    short: "Vermelho",
    dot: "bg-rose-500",
    ring: "ring-rose-500/40",
    chip: "border-rose-500/40 text-rose-100 bg-rose-500/10",
    glow: "shadow-[0_0_6px_rgba(244,63,94,0.7)]",
  },
} as const;

type PresenceResponse = { presence?: { regime: PresencaState; mesa_id: string } | null };

export function usePresencaRegime() {
  const [mesas, setMesas] = useState<PresenceMesa[]>([]);
  const [mesaId, setMesaId] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresenceResponse["presence"]>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const loadMesas = useCallback(async () => {
    const response = await fetch("/api/mesas", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("mesas_unavailable");
    const data = (await response.json()) as { mesas?: PresenceMesa[] };
    const next = data.mesas ?? [];
    setMesas(next);
    setMesaId((current) => resolveMesaSelection(next, current));
    setLoading(false);
  }, []);
  const loadPresence = useCallback(async () => {
    if (!mesaId) {
      setPresence(null);
      return;
    }
    const response = await fetch("/api/presence?mesa_id=" + encodeURIComponent(mesaId), {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("presence_unavailable");
    const data = (await response.json()) as PresenceResponse;
    setPresence(data.presence ?? null);
  }, [mesaId]);
  useEffect(() => {
    void loadMesas().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "mesas_unavailable");
      setLoading(false);
    });
  }, [loadMesas]);
  useEffect(() => {
    void loadPresence().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : "presence_unavailable"),
    );
  }, [loadPresence]);
  usePolling(
    () =>
      loadMesas().catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "mesas_unavailable"),
      ),
    true,
  );
  usePolling(
    () =>
      loadPresence().catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "presence_unavailable"),
      ),
    Boolean(mesaId),
  );
  const setMesa = useCallback((next: string) => {
    setMesaId(next || null);
    setPresence(null);
    setError(null);
  }, []);
  const setState = useCallback(
    async (regime: PresencaState) => {
      if (!mesaId) return false;
      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/presence", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mesa_id: mesaId, regime }),
        });
        if (!response.ok) throw new Error("presence_update_failed");
        const data = (await response.json()) as PresenceResponse;
        setPresence(data.presence ?? null);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "presence_update_failed");
        await loadPresence().catch(() => undefined);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [loadPresence, mesaId],
  );
  return {
    state: presence?.regime ?? null,
    isLoading: loading,
    saving,
    error,
    setState,
    nota,
    setNota,
    mesas,
    mesaId,
    setMesa,
  };
}

export async function readPresencaNota() {
  return "";
}
