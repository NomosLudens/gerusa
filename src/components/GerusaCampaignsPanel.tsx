import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Campaign = {
  id: string;
  name: string;
  premise: string;
  status: "active" | "archived";
};
type Character = {
  id: string;
  ownerUserId: string;
  campaignId: string | null;
  name: string;
  sheet: Record<string, string>;
};
type Payload = {
  mesa?: { name?: string; campaigns?: Campaign[] };
  characters?: Character[];
  students?: Array<{ id: string; name: string }>;
  error?: string;
};

const field =
  "min-h-11 w-full rounded-lg border border-[#743044] bg-[#10070b] px-3 py-2 text-sm text-[#f5e9df] placeholder:text-[#e7c9b7]/40";
const button =
  "min-h-11 rounded-lg border border-[#8a3045]/70 bg-[#4c1425] px-4 text-sm hover:bg-[#641a30] disabled:opacity-50";

export function GerusaCampaignsPanel({
  selectedMesa,
  selectedStudent,
  selectedCampaignId,
  onSelectedCampaignChange,
}: {
  selectedMesa?: string;
  selectedStudent?: string;
  selectedCampaignId?: string;
  onSelectedCampaignChange: (campaignId: string) => void;
}) {
  const [payload, setPayload] = useState<Payload>({});
  const [name, setName] = useState("");
  const [premise, setPremise] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [characterName, setCharacterName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const campaigns = useMemo(() => payload.mesa?.campaigns ?? [], [payload.mesa?.campaigns]);
  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "active"),
    [campaigns],
  );
  const selectedCampaign = activeCampaigns.find((item) => item.id === selectedCampaignId);
  const character = payload.characters?.find((item) => item.ownerUserId === selectedStudent);

  const refresh = useCallback(async () => {
    if (!selectedMesa) {
      setPayload({});
      return;
    }
    const query = new URLSearchParams({ view: "teacher", mesaId: selectedMesa });
    if (selectedStudent) query.set("studentId", selectedStudent);
    const response = await fetch(`/api/gerusa/pedagogy?${query}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) throw new Error(data.error || "Não foi possível carregar as campanhas.");
    setPayload(data);
    if (!selectedCampaignId) {
      const next = data.mesa?.campaigns?.find((item) => item.status === "active");
      if (next) onSelectedCampaignChange(next.id);
    }
  }, [onSelectedCampaignChange, selectedCampaignId, selectedMesa, selectedStudent]);

  useEffect(() => {
    setError("");
    void refresh().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Falha ao carregar campanhas."),
    );
  }, [refresh]);
  useEffect(() => {
    setCharacterName(character?.name ?? "");
  }, [character?.id, character?.name]);
  useEffect(() => {
    if (!activeCampaigns.length) return;
    if (selectedCampaignId && activeCampaigns.some((item) => item.id === selectedCampaignId))
      return;
    const characterCampaign = activeCampaigns.find((item) => item.id === character?.campaignId);
    onSelectedCampaignChange((characterCampaign ?? activeCampaigns[0]).id);
  }, [activeCampaigns, character?.campaignId, onSelectedCampaignChange, selectedCampaignId]);

  const createCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMesa || !selectedStudent || !name.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/gerusa/pedagogy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_campaign",
          mesaId: selectedMesa,
          studentId: selectedStudent,
          name,
          premise,
          status,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        campaign?: Campaign;
        error?: string;
      };
      if (!response.ok || !data.campaign)
        throw new Error(data.error || "Não foi possível criar a campanha.");
      onSelectedCampaignChange(data.campaign.id);
      setName("");
      setPremise("");
      setStatus("active");
      await refresh();
      setNotice("Campanha criada e vinculada à Mesa selecionada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar campanha.");
    } finally {
      setBusy(false);
    }
  };

  const saveCharacter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMesa || !selectedStudent || !selectedCampaign || !characterName.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/gerusa/pedagogy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_character",
          mesaId: selectedMesa,
          studentId: selectedStudent,
          campaignId: selectedCampaign.id,
          name: characterName,
          sheet: character?.sheet ?? {},
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível vincular o personagem.");
      await refresh();
      setNotice(`${characterName} vinculado a ${selectedCampaign.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar personagem.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="mb-6 rounded-2xl border border-[#742233]/50 bg-[#180b11] p-4 text-[#f5e9df] sm:p-6"
      aria-label="Campanhas da professora"
    >
      <header className="border-b border-[#742233]/40 pb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#d5a56c]">Campanhas</p>
        <h2 className="serif mt-1 text-2xl">Campanhas e personagens</h2>
        <p className="mt-1 text-sm text-[#e7c9b7]/70">
          {payload.mesa?.name ?? "Mesa selecionada"} ·{" "}
          {selectedStudent ? "aluno selecionado" : "selecione um aluno"}
        </p>
      </header>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-400/30 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-lg border border-[#8a3045]/40 p-3 text-sm text-[#f0c59a]"
        >
          {notice}
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form
          className="grid content-start gap-3 rounded-xl border border-[#742233]/35 bg-[#10070b]/60 p-4"
          onSubmit={(event) => void createCampaign(event)}
        >
          <h3 className="serif text-xl">Nova campanha</h3>
          <label className="grid gap-1 text-sm">
            Nome
            <input
              className={field}
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="The Clockmaker's Paradox"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Premissa / descrição (opcional)
            <textarea
              className={field}
              rows={3}
              maxLength={4000}
              value={premise}
              onChange={(event) => setPremise(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Status
            <select
              className={field}
              value={status}
              onChange={(event) => setStatus(event.target.value as "active" | "archived")}
            >
              <option value="active">Ativa</option>
              <option value="archived">Arquivada</option>
            </select>
          </label>
          <button
            className={button}
            disabled={busy || !selectedMesa || !selectedStudent || !name.trim()}
          >
            {busy ? "Salvando…" : "Criar campanha"}
          </button>
        </form>

        <div className="grid content-start gap-3 rounded-xl border border-[#742233]/35 bg-[#10070b]/60 p-4">
          <h3 className="serif text-xl">Campanha do aluno</h3>
          <label className="grid gap-1 text-sm">
            Campanha ativa
            <select
              className={field}
              value={selectedCampaign?.id ?? ""}
              onChange={(event) => onSelectedCampaignChange(event.target.value)}
            >
              <option value="">Selecione uma campanha</option>
              {activeCampaigns.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {selectedCampaign ? (
            <p className="rounded-lg border border-[#742233]/30 p-3 text-sm text-[#e7c9b7]/80">
              {selectedCampaign.premise || "Sem premissa cadastrada."}
            </p>
          ) : null}
          <form className="grid gap-3" onSubmit={(event) => void saveCharacter(event)}>
            <label className="grid gap-1 text-sm">
              Personagem de {payload.students?.[0]?.name ?? "aluno selecionado"}
              <input
                className={field}
                required
                maxLength={100}
                value={characterName}
                onChange={(event) => setCharacterName(event.target.value)}
                placeholder="Elias Ward"
              />
            </label>
            <button
              className={button}
              disabled={
                busy ||
                !selectedMesa ||
                !selectedStudent ||
                !selectedCampaign ||
                !characterName.trim()
              }
            >
              {busy ? "Salvando…" : "Criar personagem nesta campanha"}
            </button>
          </form>
          {character ? (
            <p className="text-xs text-[#e7c9b7]/65">
              Personagem atual: {character.name}
              {character.campaignId === selectedCampaign?.id
                ? " · vinculado à campanha"
                : " · pronto para vincular"}
            </p>
          ) : null}
        </div>
      </div>
      <ul className="mt-4 divide-y divide-[#742233]/35 rounded-xl border border-[#742233]/35">
        {campaigns.map((campaign) => (
          <li key={campaign.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="font-medium">{campaign.name}</p>
              {campaign.premise ? (
                <p className="mt-1 text-sm text-[#e7c9b7]/70">{campaign.premise}</p>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full border border-[#8a3045]/50 px-2 py-1 text-xs text-[#e7c9b7]/75">
              {campaign.status === "active" ? "Ativa" : "Arquivada"}
            </span>
          </li>
        ))}
        {!campaigns.length ? (
          <li className="p-3 text-sm text-[#e7c9b7]/65">Nenhuma campanha nesta Mesa.</li>
        ) : null}
      </ul>
    </section>
  );
}
