import { useEffect, useState } from "react";

type Character = {
  id: string;
  name: string;
  playerName: string;
  ownerDisplayName?: string;
  snapshot: Record<string, unknown>;
};
type PendingProgression = {
  id: string;
  characterId: string;
  characterName: string;
  playerName: string;
  fromMarco: number;
  toMarco: number;
  status: string;
  proposedSnapshot?: Record<string, unknown> | null;
  epicManifestationStatus?: string | null;
  epicManifestationFeedback?: string | null;
};
type Precedent = PendingProgression;
const trailOf = (snapshot: Record<string, unknown>) => {
  const trails = Array.isArray(snapshot.trilhas) ? snapshot.trilhas : [];
  const trail = trails[Number(snapshot.trilhaAtiva) || 0];
  return trail && typeof trail === "object" ? (trail as Record<string, unknown>) : null;
};
const manifestationOf = (snapshot?: Record<string, unknown> | null) => {
  const trail = snapshot ? trailOf(snapshot) : null;
  const items = trail && Array.isArray(trail.manifestacoesEpicas) ? trail.manifestacoesEpicas : [];
  const item = items[items.length - 1];
  return item && typeof item === "object" ? (item as Record<string, unknown>) : null;
};

export function CharacterReviewQueue() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [progression, setProgression] = useState<PendingProgression[]>([]);
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  async function load() {
    setError(null);
    const response = await fetch("/api/characters?reviewQueue=true", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      characters?: Character[];
      progression?: PendingProgression[];
      precedents?: Precedent[];
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error || "review_queue_failed");
    setCharacters(payload.characters || []);
    setProgression(payload.progression || []);
    setPrecedents(payload.precedents || []);
  }
  useEffect(() => {
    void load().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : "review_queue_failed"),
    );
  }, []);
  async function decide(character: Character, action: "approve" | "reject") {
    setBusy(character.id);
    setError(null);
    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: character.id, action, note: notes[character.id]?.trim() || "" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "character_review_failed");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "character_review_failed");
    } finally {
      setBusy(null);
    }
  }
  async function decideProgression(
    item: PendingProgression,
    action:
      | "enable"
      | "reject_progression"
      | "approve_epic"
      | "provisionally_approve_epic"
      | "return_epic"
      | "reject_epic",
  ) {
    setBusy(`progression:${item.id}`);
    setError(null);
    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: item.characterId,
          action,
          feedback: notes[item.id]?.trim() || "",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "progression_review_failed");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "progression_review_failed");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="mx-auto mb-6 max-w-6xl rounded-xl border border-white/10 bg-black/20 p-5 text-white">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">Character Forge</p>
          <h2 className="text-xl font-semibold">Fila de revisão</h2>
        </div>
        <button
          className="rounded border border-white/20 px-3 py-2 text-sm"
          onClick={() => void load()}
        >
          Atualizar
        </button>
      </div>
      {error ? (
        <p className="mb-3 rounded border border-red-400/40 p-3 text-sm text-red-200">
          Erro: {error}
        </p>
      ) : null}
      {progression.length ? (
        <div className="mb-5 rounded-lg border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/10 p-4">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--gold)]/70">
              MANIFESTAÇÕES PARA HOMOLOGAÇÃO
            </p>
            <h3 className="text-lg font-semibold">Propostas aguardando análise humana</h3>
            <p className="mt-1 text-sm text-white/60">
              A proposta é do jogador. Você decide o estado e registra feedback; o conteúdo não é
              reescrito silenciosamente.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {progression.map((item) => {
              const proposal = manifestationOf(item.proposedSnapshot);
              const proposalTrail = item.proposedSnapshot ? trailOf(item.proposedSnapshot) : null;
              const office = String(proposal?.oficio || proposalTrail?.oficio || "—");
              const epic = item.toMarco >= 11;
              return (
                <article className="rounded-lg border border-white/10 p-4" key={item.id}>
                  <h4 className="font-semibold">{item.characterName || "Personagem"}</h4>
                  <p className="mt-1 text-sm text-white/65">
                    Jogador: {item.playerName || "—"} · Marco {item.fromMarco} → {item.toMarco} ·
                    Ofício {office}
                  </p>
                  {proposal ? (
                    <details
                      className="mt-3 rounded border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/10 p-3 text-sm"
                      open={epic}
                    >
                      <summary className="cursor-pointer text-[color:var(--gold)]">
                        Proposta completa da Manifestação Épica
                      </summary>
                      <div className="mt-2 grid gap-1 text-white/70">
                        <p>
                          <b>Nome:</b> {String(proposal.nome || "—")}
                        </p>
                        <p>
                          <b>Conceito:</b> {String(proposal.conceito || "—")}
                        </p>
                        <p>
                          <b>Marco de origem:</b> {String(proposal.marco || item.toMarco)} ·{" "}
                          <b>Horizonte:</b> {String(proposal.horizonte || "—")}
                        </p>
                        <p>
                          <b>Tipo:</b> {String(proposal.tipo || "normal")} ·{" "}
                          <b>Grau de Magia Épica:</b> {String(proposal.grauMagiaEpica || "—")}
                        </p>
                        <p>
                          <b>Descrição/manifestação:</b>{" "}
                          {String(
                            proposal.descricao || proposal.manifestacao_visual_ou_ficcional || "—",
                          )}
                        </p>
                        <p>
                          <b>Ativação:</b> {String(proposal.ativacao || "—")}
                        </p>
                        <p>
                          <b>Efeito:</b> {String(proposal.efeito || "—")}
                        </p>
                        <p>
                          <b>Custo:</b> {String(proposal.custo || "—")} · <b>Duração:</b>{" "}
                          {String(proposal.duracao || "—")}
                        </p>
                        <p>
                          <b>Alvos/objeto:</b> {String(proposal.alvos_ou_objeto || "—")}
                        </p>
                        <p>
                          <b>Limitações:</b> {String(proposal.limitacoes || "—")}
                        </p>
                        <p>
                          <b>Consequências/riscos:</b>{" "}
                          {String(proposal.consequencias_ou_riscos || "—")}
                        </p>
                        <p>
                          <b>Estado:</b>{" "}
                          {String(
                            proposal.statusHomologacao || item.epicManifestationStatus || "—",
                          )}
                        </p>
                      </div>
                    </details>
                  ) : null}
                  {epic ? (
                    <>
                      <details className="mt-3 rounded border border-white/10 p-3 text-sm">
                        <summary className="cursor-pointer text-white/80">
                          Checklist do Mestre
                        </summary>
                        <div className="mt-2 space-y-1 text-white/65">
                          <p>□ Pertence a esta personagem?</p>
                          <p>□ Está no Ofício correto?</p>
                          <p>
                            □ Cabe no Horizonte {String(proposal?.horizonte || "derivado do Marco")}
                            ?
                          </p>
                          <p>□ Está operacionalmente clara?</p>
                          <p>□ Possui limites suficientes?</p>
                          <p>□ Preserva economia de ações e autonomia?</p>
                          <p>□ Usa sistemas existentes?</p>
                          <p>□ É épica por possibilidade, não por números?</p>
                          <p className="pt-2 text-white/45">
                            Não conceder turno, ação, reação, recurso ou controle absoluto novos;
                            preservar a autonomia dos envolvidos.
                          </p>
                        </div>
                      </details>
                      <p className="mt-2 text-xs text-white/45">
                        Horizonte é escala narrativa de consequência, não raio, metros, área física
                        ou número de alvos.
                      </p>
                      <textarea
                        className="mt-3 min-h-20 w-full rounded border border-white/15 bg-black/20 p-2 text-sm"
                        placeholder="Feedback obrigatório para devolver ou não homologar"
                        value={notes[item.id] || ""}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="rounded bg-emerald-700 px-3 py-2 text-sm"
                          disabled={busy === `progression:${item.id}`}
                          onClick={() => void decideProgression(item, "approve_epic")}
                        >
                          Homologar
                        </button>
                        <button
                          className="rounded bg-amber-700 px-3 py-2 text-sm"
                          disabled={busy === `progression:${item.id}`}
                          onClick={() => void decideProgression(item, "provisionally_approve_epic")}
                        >
                          Homologar provisoriamente
                        </button>
                        <button
                          className="rounded bg-sky-800 px-3 py-2 text-sm"
                          disabled={busy === `progression:${item.id}`}
                          onClick={() => void decideProgression(item, "return_epic")}
                        >
                          Devolver para ajuste
                        </button>
                        <button
                          className="rounded bg-red-800 px-3 py-2 text-sm"
                          disabled={busy === `progression:${item.id}`}
                          onClick={() => void decideProgression(item, "reject_epic")}
                        >
                          Não homologar
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded bg-emerald-700 px-3 py-2 text-sm"
                        disabled={busy === `progression:${item.id}`}
                        onClick={() => void decideProgression(item, "enable")}
                      >
                        Autorizar Marco {item.toMarco}
                      </button>
                      <button
                        className="rounded bg-red-800 px-3 py-2 text-sm"
                        disabled={busy === `progression:${item.id}`}
                        onClick={() => void decideProgression(item, "reject_progression")}
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
      {precedents.length ? (
        <details className="mb-5 rounded-lg border border-white/10 p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Precedentes homologados da Mesa
          </summary>
          <p className="mt-2 text-xs text-white/50">
            Somente propostas homologadas em mesas às quais você tem acesso. Elas não são cânone
            global.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {precedents.map((item) => {
              const proposal = manifestationOf(item.proposedSnapshot);
              return (
                <div className="rounded border border-white/10 p-3 text-sm" key={item.id}>
                  <p className="font-medium">{String(proposal?.nome || item.characterName)}</p>
                  <p className="text-white/60">
                    {item.characterName} · Marco {item.toMarco} ·{" "}
                    {String(proposal?.horizonte || "—")} ·{" "}
                    {String(item.epicManifestationStatus || "—")}
                  </p>
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
      {!characters.length ? (
        <p className="text-sm text-white/60">Nenhuma personagem submetida.</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {characters.map((character) => {
          const trail = trailOf(character.snapshot);
          const playerName = character.playerName || character.ownerDisplayName || "—";
          return (
            <article className="rounded-lg border border-white/10 p-4" key={character.id}>
              <h3 className="font-semibold">{character.name || "Sem nome"}</h3>
              <p className="mt-1 text-sm text-white/65">
                Jogador: {playerName} · {String(character.snapshot.povo || "Povo não definido")} ·{" "}
                {String(trail?.oficio || "Ofício não definido")} · Marco {String(trail?.marco || 1)}
              </p>
              <a
                className="mt-3 inline-flex rounded border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/15 px-3 py-2 text-sm text-[color:var(--ivory)]"
                href={
                  "/microapp?app=character-forge&mode=tal&characterId=" +
                  encodeURIComponent(character.id)
                }
              >
                Abrir ficha canônica no Character Forge
              </a>
              <textarea
                className="mt-3 min-h-20 w-full rounded border border-white/15 bg-black/20 p-2 text-sm"
                placeholder="Nota da rejeição (opcional)"
                value={notes[character.id] || ""}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [character.id]: event.target.value }))
                }
              />
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded bg-emerald-700 px-3 py-2 text-sm"
                  disabled={busy === character.id}
                  onClick={() => void decide(character, "approve")}
                >
                  Aprovar / publicar
                </button>
                <button
                  className="rounded bg-red-800 px-3 py-2 text-sm"
                  disabled={busy === character.id}
                  onClick={() => void decide(character, "reject")}
                >
                  Rejeitar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
