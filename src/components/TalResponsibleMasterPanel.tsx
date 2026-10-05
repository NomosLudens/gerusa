import { useCallback, useEffect, useState } from "react";

type Mesa = { id: string; name: string };
type Master = { id: string; display_name: string | null };
type State = {
  mesa?: Mesa;
  explicitMaster?: string | null;
  resolvedMaster?: string | null;
  isFallbackToTal?: boolean;
  isTal?: boolean;
  eligibleMasters?: Master[];
  resolved?: State;
};

export function TalResponsibleMasterPanel({
  mesas,
  initiallyTal,
}: {
  mesas: Mesa[];
  initiallyTal: boolean;
}) {
  const [mesaId, setMesaId] = useState(mesas[0]?.id ?? "");
  const [state, setState] = useState<State | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!mesaId) return;
    try {
      const response = await fetch(
        "/api/admin/mesa-responsible-master?mesa_id=" + encodeURIComponent(mesaId),
        { credentials: "same-origin", cache: "no-store" },
      );
      const data = (await response.json().catch(() => ({}))) as State & { error?: string };
      if (!response.ok) throw new Error(data.error || "responsible_master_failed");
      setState(data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "responsible_master_failed");
    }
  }, [mesaId]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!mesaId && mesas[0]) setMesaId(mesas[0].id);
  }, [mesaId, mesas]);
  const save = async (method: "PUT" | "DELETE", masterUserId?: string) => {
    if (!mesaId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/mesa-responsible-master", {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "PUT"
            ? { mesa_id: mesaId, master_user_id: masterUserId }
            : { mesa_id: mesaId },
        ),
      });
      const data = (await response.json().catch(() => ({}))) as State & { error?: string };
      if (!response.ok) throw new Error(data.error || "responsible_master_failed");
      const result = method === "DELETE" ? (data.resolved ?? data) : data;
      setState((current) => ({ ...current, ...result, eligibleMasters: current?.eligibleMasters }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "responsible_master_failed");
    } finally {
      setSaving(false);
    }
  };
  const isTal = state?.isTal ?? initiallyTal;
  const currentName = state?.isFallbackToTal
    ? "TAL"
    : state?.eligibleMasters?.find((master) => master.id === state.resolvedMaster)?.display_name ||
      "TAL";
  return (
    <section className="space-y-4 rounded-xl border border-[color:var(--gold)]/40 p-4">
      <div>
        <h2 className="text-sm text-[color:var(--gold)]">Responsável operacional da Mesa</h2>
        <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
          A delegação altera apenas o Mestre responsável pelo canal privado. O fallback continua
          sendo o TAL.
        </p>
      </div>
      <label className="block text-xs text-[color:var(--ivory-dim)]">
        Mesa
        <select
          value={mesaId}
          onChange={(event) => setMesaId(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
        >
          {mesas.map((mesa) => (
            <option key={mesa.id} value={mesa.id}>
              {mesa.name}
            </option>
          ))}
        </select>
      </label>
      <p className="rounded-lg border border-white/10 bg-black/10 p-3 text-sm text-[color:var(--ivory)]">
        Responsável efetivo: <strong>{currentName}</strong>
        {state?.isFallbackToTal ? (
          <span className="ml-2 text-xs text-[color:var(--ivory-dim)]">(fallback TAL)</span>
        ) : null}
      </p>
      {isTal ? (
        <div className="space-y-3">
          <label className="block text-xs text-[color:var(--ivory-dim)]">
            Mestre delegado
            <select
              value={state?.resolvedMaster ?? ""}
              onChange={(event) => void save("PUT", event.target.value)}
              disabled={saving || !state?.eligibleMasters?.length}
              className="mt-2 min-h-11 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
            >
              <option value="">Selecione um Mestre</option>
              {state?.eligibleMasters?.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.display_name || "Mestre sem nome"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={saving || !state?.explicitMaster}
            onClick={() => void save("DELETE")}
            className="min-h-11 rounded-xl border border-[color:var(--border)] px-4 text-sm text-[color:var(--ivory)] disabled:opacity-40"
          >
            Remover delegação
          </button>
        </div>
      ) : (
        <p className="text-xs text-[color:var(--ivory-dim)]">
          Somente TAL pode atribuir, trocar ou remover a delegação.
        </p>
      )}
      {error ? (
        <p role="alert" className="text-xs text-red-300">
          Não foi possível atualizar o responsável.
        </p>
      ) : null}
    </section>
  );
}
