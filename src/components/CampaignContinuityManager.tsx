import { useCallback, useEffect, useState } from "react";

type Adventure = {
  id: string;
  studentId: string;
  campaignId: string | null;
  campaignName?: string | null;
  title: string;
  premise: string;
  pedagogicalObjective: string;
  grammarTarget: string;
  vocabulary: string[];
  estimatedMinutes: number | null;
  tone: string;
  difficulty: string;
  scenes: unknown[];
  npcs: unknown[];
  choices: string[];
  challenges: string[];
  englishQuestions: string[];
  supports: string[];
  conclusion: string;
  hook: string;
  suggestedTask: string;
  status: string;
};
type Payload = {
  students?: Array<{ id: string; name: string }>;
  mesa?: { campaigns?: Array<{ id: string; name: string; status?: string }> };
  adventures?: Adventure[];
  lessons?: Array<{ id: string; title: string; adventureId: string | null; status: string }>;
  sessions?: Array<{
    id: string;
    lessonId: string;
    summary: Record<string, unknown>;
    endedAt: string | null;
  }>;
  records?: Array<{ id: string; observation: string; createdAt: string }>;
  assignments?: Array<{
    id: string;
    title: string;
    status: string;
    studentName: string;
    createdAt: string;
  }>;
  characters?: Array<{ id: string; name: string; ownerUserId: string; updatedAt: string }>;
  error?: string;
};
const blank: Omit<Adventure, "id" | "studentId" | "status"> = {
  campaignId: null,
  title: "",
  premise: "",
  pedagogicalObjective: "",
  grammarTarget: "",
  vocabulary: [],
  estimatedMinutes: 45,
  tone: "",
  difficulty: "",
  scenes: [],
  npcs: [],
  choices: [],
  challenges: [],
  englishQuestions: [],
  supports: [],
  conclusion: "",
  hook: "",
  suggestedTask: "",
};
const field =
  "min-h-11 w-full rounded-lg border border-[#743044] bg-[#10070b] px-3 py-2 text-sm text-[#f5e9df] placeholder:text-[#e7c9b7]/40";
const button =
  "min-h-10 rounded-lg border border-[#8a3045]/70 px-3 text-sm hover:bg-[#742233]/25 disabled:opacity-50";
const arrayFields = [
  "vocabulary",
  "choices",
  "challenges",
  "englishQuestions",
  "supports",
] as const;
function lines(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n")
    : "";
}
function dateLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";
}

export function CampaignContinuityManager({
  selectedMesa,
  selectedStudent,
  selectedCampaignId,
  onSelectedCampaignChange,
  libraryMode = false,
}: {
  selectedMesa?: string;
  selectedStudent?: string;
  selectedCampaignId?: string;
  onSelectedCampaignChange: (campaignId: string) => void;
  libraryMode?: boolean;
}) {
  const [payload, setPayload] = useState<Payload>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...blank });
  const [scenesJson, setScenesJson] = useState("[]");
  const [npcsJson, setNpcsJson] = useState("[]");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const adventures = payload.adventures ?? [];
  const selected = adventures.find((item) => item.id === selectedId) ?? null;
  const selectedStudentName = payload.students?.find((item) => item.id === selectedStudent)?.name;
  const refresh = useCallback(async () => {
    if (!selectedMesa || !selectedStudent) {
      setPayload({});
      return;
    }
    const query = new URLSearchParams({
      view: "teacher",
      mesaId: selectedMesa,
      studentId: selectedStudent,
    });
    const response = await fetch(`/api/gerusa/pedagogy?${query}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) throw new Error(data.error || "Não foi possível carregar as aventuras.");
    setPayload(data);
  }, [selectedMesa, selectedStudent]);
  useEffect(() => {
    void refresh().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Falha ao carregar."),
    );
  }, [refresh]);
  useEffect(() => {
    setSelectedId(null);
    setDraft({ ...blank });
    setScenesJson("[]");
    setNpcsJson("[]");
  }, [selectedMesa, selectedStudent]);

  useEffect(() => {
    if (
      !selectedId &&
      selectedCampaignId &&
      payload.mesa?.campaigns?.some((item) => item.id === selectedCampaignId)
    ) {
      setDraft((current) => ({ ...current, campaignId: selectedCampaignId }));
    }
  }, [payload.mesa?.campaigns, selectedCampaignId, selectedId]);

  const choose = (adventure: Adventure) => {
    setSelectedId(adventure.id);
    if (adventure.campaignId) onSelectedCampaignChange(adventure.campaignId);
    const { id: _id, studentId: _studentId, status: _status, ...values } = adventure;
    setDraft({ ...blank, ...values });
    setScenesJson(JSON.stringify(adventure.scenes, null, 2));
    setNpcsJson(JSON.stringify(adventure.npcs, null, 2));
    setError("");
  };
  const save = async (value = draft, id = selectedId) => {
    if (!selectedMesa || !selectedStudent) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const scenes = JSON.parse(scenesJson) as unknown[];
      const npcs = JSON.parse(npcsJson) as unknown[];
      if (!Array.isArray(scenes) || !Array.isArray(npcs))
        throw new Error("Cenas e NPCs precisam ser listas JSON.");
      const response = await fetch("/api/gerusa/pedagogy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_adventure",
          mesaId: selectedMesa,
          studentId: selectedStudent,
          ...value,
          campaignId: value.campaignId || selectedCampaignId || null,
          scenes,
          npcs,
          id,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        adventureId?: string;
        error?: string;
      };
      if (!response.ok || !data.adventureId)
        throw new Error(data.error || "Não foi possível salvar a aventura.");
      setSelectedId(data.adventureId);
      await refresh();
      setNotice("Aventura salva no PostgreSQL Gerusa.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    if (!selectedMesa || !selectedStudent) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/gerusa/action", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adventure",
          mesaId: selectedMesa,
          studentId: selectedStudent,
          fields: {
            campaignId: draft.campaignId,
            theme: draft.title,
            premise: draft.premise,
            objective: draft.pedagogicalObjective,
            grammar: draft.grammarTarget,
            vocabulary: draft.vocabulary,
            durationMinutes: draft.estimatedMinutes,
            tone: draft.tone,
            difficulty: draft.difficulty,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        proposal?: Omit<Adventure, "id" | "studentId" | "status">;
        error?: string;
      };
      if (!response.ok || !data.proposal)
        throw new Error(data.error || "Gerusa não gerou a aventura.");
      setSelectedId(null);
      setDraft({ ...blank, ...data.proposal, campaignId: draft.campaignId });
      setScenesJson(JSON.stringify(data.proposal.scenes, null, 2));
      setNpcsJson(JSON.stringify(data.proposal.npcs, null, 2));
      setNotice("Aventura estruturada. Revise e salve após editar.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na geração.");
    } finally {
      setBusy(false);
    }
  };
  const archive = async (adventure: Adventure) => {
    if (!window.confirm(`Arquivar “${adventure.title}”?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/gerusa/pedagogy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: adventure.status === "archived" ? "reopen_adventure" : "archive_adventure",
          mesaId: selectedMesa,
          studentId: selectedStudent,
          adventureId: adventure.id,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível alterar o arquivo.");
      await refresh();
      setNotice(adventure.status === "archived" ? "Aventura reaberta." : "Aventura arquivada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao arquivar.");
    } finally {
      setBusy(false);
    }
  };
  const duplicate = (adventure: Adventure) => {
    choose(adventure);
    setSelectedId(null);
    setDraft((current) => ({ ...current, title: `${adventure.title} (cópia)` }));
  };
  const updateArray = (key: (typeof arrayFields)[number], value: string) =>
    setDraft((current) => ({
      ...current,
      [key]: value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    }));

  return (
    <section
      className="mb-6 rounded-2xl border border-[#742233]/50 bg-[#180b11] p-4 text-[#f5e9df] sm:p-6"
      aria-label="Aventuras e continuidade pedagógica"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#742233]/40 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#d5a56c]">
            Continuidade narrativa e pedagógica
          </p>
          <h2 className="serif mt-1 text-2xl">
            {libraryMode ? "Biblioteca de aventuras e aulas" : "Aventuras"}
          </h2>
          <p className="mt-1 text-sm text-[#e7c9b7]/70">
            {selectedStudentName || "Aluno selecionado"} ·{" "}
            {selected?.title || "campanha selecionada"}.
          </p>
        </div>
        <button
          type="button"
          className={button}
          onClick={() => {
            setSelectedId(null);
            setDraft({ ...blank, campaignId: selectedCampaignId || null });
            setNotice("");
          }}
        >
          Nova aventura
        </button>
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
      {!libraryMode ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-[#742233]/35 bg-[#10070b]/60 p-4 sm:grid-cols-2">
          <label className="text-sm">
            Campanha
            <select
              className={field}
              value={draft.campaignId ?? ""}
              onChange={(e) => {
                onSelectedCampaignChange(e.target.value);
                setDraft({ ...draft, campaignId: e.target.value || null });
              }}
            >
              <option value="">Mesa atual</option>
              {payload.mesa?.campaigns
                ?.filter((item) => item.status !== "archived")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm">
            Título / tema
            <input
              className={field}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Premissa
            <textarea
              className={field}
              rows={2}
              value={draft.premise}
              onChange={(e) => setDraft({ ...draft, premise: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Objetivo pedagógico
            <input
              className={field}
              value={draft.pedagogicalObjective}
              onChange={(e) => setDraft({ ...draft, pedagogicalObjective: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Gramática alvo
            <input
              className={field}
              value={draft.grammarTarget}
              onChange={(e) => setDraft({ ...draft, grammarTarget: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Vocabulário
            <textarea
              className={field}
              rows={2}
              value={lines(draft.vocabulary)}
              onChange={(e) => updateArray("vocabulary", e.target.value)}
              placeholder="Uma expressão por linha"
            />
          </label>
          <label className="text-sm">
            Duração (minutos)
            <input
              className={field}
              type="number"
              min={5}
              max={240}
              value={draft.estimatedMinutes ?? 45}
              onChange={(e) => setDraft({ ...draft, estimatedMinutes: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm">
            Tom
            <input
              className={field}
              value={draft.tone}
              onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Dificuldade
            <input
              className={field}
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Cenas — JSON editável
            <textarea
              className={field + " font-mono text-xs"}
              rows={6}
              value={scenesJson}
              onChange={(e) => setScenesJson(e.target.value)}
            />
          </label>
          <label className="text-sm">
            NPCs — JSON
            <textarea
              className={field + " font-mono text-xs"}
              rows={4}
              value={npcsJson}
              onChange={(e) => setNpcsJson(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Escolhas
            <textarea
              className={field}
              rows={3}
              value={lines(draft.choices)}
              onChange={(e) =>
                setDraft({ ...draft, choices: e.target.value.split("\n").filter(Boolean) })
              }
            />
          </label>
          <label className="text-sm">
            Desafios
            <textarea
              className={field}
              rows={3}
              value={lines(draft.challenges)}
              onChange={(e) => updateArray("challenges", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Perguntas em inglês
            <textarea
              className={field}
              rows={3}
              value={lines(draft.englishQuestions)}
              onChange={(e) => updateArray("englishQuestions", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Apoios possíveis
            <textarea
              className={field}
              rows={3}
              value={lines(draft.supports)}
              onChange={(e) => updateArray("supports", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Conclusão
            <textarea
              className={field}
              rows={2}
              value={draft.conclusion}
              onChange={(e) => setDraft({ ...draft, conclusion: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Gancho
            <textarea
              className={field}
              rows={2}
              value={draft.hook}
              onChange={(e) => setDraft({ ...draft, hook: e.target.value })}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Tarefa sugerida
            <textarea
              className={field}
              rows={2}
              value={draft.suggestedTask}
              onChange={(e) => setDraft({ ...draft, suggestedTask: e.target.value })}
            />
          </label>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              disabled={busy || !draft.campaignId}
              onClick={() => void generate()}
            >
              Gerusa, gerar aventura
            </button>
            <button
              type="button"
              className={button}
              disabled={busy || !draft.title.trim() || !draft.campaignId}
              onClick={() => void save()}
            >
              {selectedId ? "Salvar alterações" : "Salvar aventura"}
            </button>
          </div>
        </div>
      ) : null}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {adventures.map((adventure) => (
          <article
            key={adventure.id}
            className="rounded-xl border border-[#742233]/40 bg-[#10070b]/60 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="serif text-xl">{adventure.title}</h3>
                <p className="mt-1 text-xs text-[#e7c9b7]/65">
                  Campanha: {adventure.campaignName || "Sem campanha"} · Aluno:{" "}
                  {selectedStudentName || "—"} ·{" "}
                  {adventure.status === "archived" ? "Arquivada" : "Ativa"} ·{" "}
                  {adventure.grammarTarget || "sem gramática alvo"}
                </p>
              </div>
              <span className="text-sm text-[#d5a56c]">
                {adventure.estimatedMinutes ?? "—"} min
              </span>
            </div>
            <p className="mt-3 text-sm text-[#e7c9b7]/80">{adventure.premise}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!libraryMode ? (
                <>
                  <button className={button} type="button" onClick={() => choose(adventure)}>
                    Editar
                  </button>
                  <button className={button} type="button" onClick={() => duplicate(adventure)}>
                    Duplicar
                  </button>
                  <button
                    className={button}
                    type="button"
                    disabled={busy}
                    onClick={() => void archive(adventure)}
                  >
                    {adventure.status === "archived" ? "Reabrir" : "Arquivar"}
                  </button>
                </>
              ) : null}
              <span className="text-xs text-[#e7c9b7]/60">
                {(adventure.vocabulary ?? []).join(", ")}
              </span>
            </div>
          </article>
        ))}
        {!adventures.length ? (
          <p className="text-sm text-[#e7c9b7]/65">Nenhuma aventura salva neste contexto.</p>
        ) : null}
      </div>
      <section className="mt-6 border-t border-[#742233]/35 pt-4">
        <h3 className="serif text-xl">Histórico pedagógico</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(payload.lessons ?? []).map((lesson) => (
            <article key={lesson.id} className="rounded-lg border border-[#742233]/30 p-3">
              <strong>{lesson.title}</strong>
              <p className="mt-1 text-xs text-[#e7c9b7]/65">
                {lesson.status} ·{" "}
                {dateLabel(
                  (payload.sessions ?? []).find((item) => item.lessonId === lesson.id)?.endedAt ??
                    null,
                )}
              </p>
              <p className="mt-2 text-sm text-[#e7c9b7]/80">
                Aventura: {adventures.find((item) => item.id === lesson.adventureId)?.title ?? "—"}
              </p>
              {(payload.sessions ?? []).find((item) => item.lessonId === lesson.id)?.summary ? (
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {JSON.stringify(
                    (payload.sessions ?? []).find((item) => item.lessonId === lesson.id)?.summary,
                    null,
                    2,
                  )}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
        <ul className="mt-3 space-y-2">
          {(payload.records ?? []).slice(0, 8).map((record) => (
            <li key={record.id} className="rounded-lg border border-[#742233]/25 p-3 text-sm">
              <time className="mr-2 text-xs text-[#d5a56c]">{dateLabel(record.createdAt)}</time>
              {record.observation}
            </li>
          ))}
        </ul>
      </section>
      {libraryMode ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-[#742233]/35 p-4">
            <h3 className="serif text-xl">Tarefas</h3>
            <ul className="mt-2 space-y-2">
              {(payload.assignments ?? []).slice(0, 12).map((item) => (
                <li key={item.id} className="rounded-lg bg-[#10070b] p-3 text-sm">
                  <strong>{item.title}</strong>
                  <span className="ml-2 text-xs text-[#d5a56c]">
                    {item.status} · {item.studentName}
                  </span>
                </li>
              ))}
            </ul>
            {!payload.assignments?.length ? (
              <p className="mt-2 text-sm text-[#e7c9b7]/65">Nenhuma tarefa encontrada.</p>
            ) : null}
          </article>
          <article className="rounded-xl border border-[#742233]/35 p-4">
            <h3 className="serif text-xl">Personagens</h3>
            <ul className="mt-2 space-y-2">
              {(payload.characters ?? []).map((item) => (
                <li key={item.id} className="rounded-lg bg-[#10070b] p-3 text-sm">
                  <strong>{item.name}</strong>
                  <span className="ml-2 text-xs text-[#d5a56c]">{dateLabel(item.updatedAt)}</span>
                </li>
              ))}
            </ul>
            {!payload.characters?.length ? (
              <p className="mt-2 text-sm text-[#e7c9b7]/65">
                Nenhuma ficha encontrada neste contexto.
              </p>
            ) : null}
          </article>
        </section>
      ) : null}
    </section>
  );
}
