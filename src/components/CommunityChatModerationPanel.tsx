import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Counts = { activeCount: number; archivedCount: number };

export function CommunityChatModerationPanel() {
  const [counts, setCounts] = useState<Counts>({ activeCount: 0, archivedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"archive" | "restore" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/master/community-chat", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as Partial<Counts> & {
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar o Chat Geral");
    setCounts({ activeCount: payload.activeCount ?? 0, archivedCount: payload.archivedCount ?? 0 });
  }, []);

  useEffect(() => {
    void load()
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Falha ao carregar o Chat Geral"),
      )
      .finally(() => setLoading(false));
  }, [load]);

  async function changeArchive(action: "archive_all" | "restore_all") {
    const isArchiving = action === "archive_all";
    const count = isArchiving ? counts.activeCount : counts.archivedCount;
    if (
      !count ||
      !window.confirm(
        isArchiving
          ? `Arquivar as ${count} mensagens visíveis do Chat Geral? Elas serão preservadas e poderão ser restauradas.`
          : `Restaurar as ${count} mensagens arquivadas no Chat Geral?`,
      )
    )
      return;
    setBusy(isArchiving ? "archive" : "restore");
    setMessage(null);
    try {
      const response = await fetch("/api/master/community-chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        affected?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Falha ao atualizar o arquivamento");
      setMessage(
        `${payload.affected ?? 0} mensagem(ns) ${isArchiving ? "arquivada(s)" : "restaurada(s)"}.`,
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar o arquivamento");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-[color:var(--gold)]/40 p-4"
      aria-label="Arquivamento do Chat Geral"
    >
      <div>
        <h3 className="text-sm text-[color:var(--gold)]">Arquivamento do Chat Geral</h3>
        <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
          Retira mensagens da visão dos jogadores sem apagar o histórico.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-[color:var(--ivory-dim)]">Carregando mensagens…</p>
      ) : (
        <>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-[color:var(--ivory-dim)]">
              Visíveis: <strong className="text-[color:var(--ivory)]">{counts.activeCount}</strong>
            </div>
            <div className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-[color:var(--ivory-dim)]">
              Arquivadas:{" "}
              <strong className="text-[color:var(--ivory)]">{counts.archivedCount}</strong>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void changeArchive("archive_all")}
              disabled={busy !== null || counts.activeCount === 0}
              className="h-10 px-4"
            >
              {busy === "archive" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Arquivar mensagens visíveis"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void changeArchive("restore_all")}
              disabled={busy !== null || counts.archivedCount === 0}
              className="h-10 px-4"
            >
              {busy === "restore" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Restaurar arquivadas"
              )}
            </Button>
          </div>
        </>
      )}
      {message ? (
        <p role="status" className="text-xs text-[color:var(--ivory-dim)]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
