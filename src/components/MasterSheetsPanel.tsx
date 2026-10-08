import { useCallback, useEffect, useMemo, useState } from "react";

type Lesson = {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  mesaId: string;
  campaignId: string | null;
  campaignName: string | null;
  adventureId: string | null;
  assignmentId: string | null;
  scheduledAt: string | null;
  status: "draft" | "planned" | "completed" | "cancelled";
  objective: string;
  grammar: string;
  vocabulary: string;
  durationMinutes: number | null;
  outline: Array<{ title: string; activity: string; prompt: string }>;
  notes: string;
};
type Character = {
  id: string;
  ownerUserId: string;
  mesaId: string;
  campaignId: string | null;
  name: string;
  sheet: Record<string, string>;
  updatedAt: string;
};
type Payload = {
  mesa?: { campaigns?: Array<{ id: string; name: string; status?: string }> };
  lessons?: Lesson[];
  characters?: Character[];
  adventures?: Array<{ id: string; title: string }>;
  assignments?: Array<{ id: string; title: string }>;
  error?: string;
};
type Draft = Omit<Lesson, "id" | "studentId" | "studentName" | "mesaId" | "campaignName">;

const emptyDraft = (): Draft => ({
  title: "Aula de RPG",
  campaignId: null,
  adventureId: null,
  assignmentId: null,
  scheduledAt: "",
  status: "planned",
  objective: "",
  grammar: "",
  vocabulary: "",
  durationMinutes: 45,
  outline: [],
  notes: "",
});
const field =
  "min-h-11 w-full rounded-lg border border-[#743044] bg-[#10070b] px-3 py-2 text-sm text-[#f5e9df] placeholder:text-[#e7c9b7]/40";
const button =
  "min-h-10 rounded-lg border border-[#8a3045]/70 px-3 text-sm text-[#f5e9df] hover:bg-[#742233]/25 disabled:opacity-50";
const labels: Record<Lesson["status"], string> = {
  draft: "rascunho",
  planned: "planejada",
  completed: "realizada",
  cancelled: "cancelada",
};

function localDate(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Sem data"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

export function MasterSheetsPanel({
  selectedMesa,
  selectedStudent,
  selectedCampaignId,
  onSelectedCampaignChange,
  onOpenSession,
}: {
  selectedMesa?: string;
  selectedStudent?: string;
  selectedCampaignId?: string;
  onSelectedCampaignChange: (campaignId: string) => void;
  onOpenSession: (lessonId: string) => void;
}) {
  const [payload, setPayload] = useState<Payload>({});
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [sheet, setSheet] = useState<Record<string, string>>({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"plan" | "character">("plan");
  const campaigns = useMemo(() => payload.mesa?.campaigns ?? [], [payload.mesa?.campaigns]);
  const activeCampaigns = useMemo(
    () => campaigns.filter((item) => item.status !== "archived"),
    [campaigns],
  );
  const currentCampaignId = activeCampaigns.some((item) => item.id === selectedCampaignId)
    ? selectedCampaignId
    : activeCampaigns[0]?.id;
  const lessons = useMemo(() => payload.lessons ?? [], [payload.lessons]);
  const characters = payload.characters ?? [];
  const adventures = payload.adventures ?? [];
  const assignments = payload.assignments ?? [];

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
    try {
      const response = await fetch(`/api/gerusa/pedagogy?${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as Payload;
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar o planejamento.");
      setPayload(data);
      const nextCharacter = data.characters?.[0] ?? null;
      setCharacter(nextCharacter);
      setCharacterName(nextCharacter?.name ?? "");
      setSheet(nextCharacter?.sheet ?? {});
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar dados.");
    }
  }, [selectedMesa, selectedStudent]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedCampaignId == null && activeCampaigns[0]) {
      onSelectedCampaignChange(activeCampaigns[0].id);
    }
  }, [activeCampaigns, onSelectedCampaignChange, selectedCampaignId]);

  useEffect(() => {
    if (
      !editingId &&
      selectedCampaignId &&
      campaigns.some((item) => item.id === selectedCampaignId)
    ) {
      setDraft((current) => ({ ...current, campaignId: selectedCampaignId }));
    }
  }, [campaigns, editingId, selectedCampaignId]);

  const visibleLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        const time = lesson.scheduledAt ? new Date(lesson.scheduledAt).getTime() : 0;
        if (fromDate && time < new Date(`${fromDate}T00:00:00`).getTime()) return false;
        if (toDate && time > new Date(`${toDate}T23:59:59`).getTime()) return false;
        return true;
      }),
    [fromDate, lessons, toDate],
  );

  const saveLesson = async (value: Draft, id: string | null = null) => {
    if (!selectedMesa || !selectedStudent) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/gerusa/pedagogy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_lesson",
          id,
          mesaId: selectedMesa,
          studentId: selectedStudent,
          ...value,
          scheduledAt: fromLocalInput(value.scheduledAt),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a aula.");
      setDraft(emptyDraft());
      setEditingId(null);
      setNotice("Aula salva no planejamento.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  const editLesson = (lesson: Lesson) => {
    onSelectedCampaignChange(lesson.campaignId ?? "");
    setEditingId(lesson.id);
    setDraft({
      title: lesson.title,
      campaignId: lesson.campaignId,
      adventureId: lesson.adventureId,
      assignmentId: lesson.assignmentId,
      scheduledAt: toLocalInput(lesson.scheduledAt),
      status: lesson.status,
      objective: lesson.objective,
      grammar: lesson.grammar,
      vocabulary: lesson.vocabulary,
      durationMinutes: lesson.durationMinutes,
      outline: lesson.outline ?? [],
      notes: lesson.notes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generatePlan = async (action: "plan_lesson" | "next_lesson" = "plan_lesson") => {
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
          action,
          mesaId: selectedMesa,
          studentId: selectedStudent,
          fields: {
            campaignId: selectedCampaignId || null,
            objective: draft.objective,
            grammar: draft.grammar,
            vocabulary: draft.vocabulary,
            durationMinutes: draft.durationMinutes,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        proposal?: {
          objective: string;
          grammar: string;
          vocabulary: string;
          durationMinutes: number;
          outline: Draft["outline"];
          adventureSuggestion: string;
          taskSuggestion: string;
        };
        error?: string;
      };
      if (!response.ok || !data.proposal)
        throw new Error(data.error || "Gerusa não conseguiu planejar agora.");
      setDraft((current) => ({
        ...current,
        ...data.proposal,
        notes: [
          current.notes,
          `Sugestão de aventura: ${data.proposal?.adventureSuggestion}`,
          `Sugestão de tarefa: ${data.proposal?.taskSuggestion}`,
        ]
          .filter(Boolean)
          .join("\n"),
      }));
      setNotice("Proposta da Gerusa carregada. Revise os campos antes de salvar.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao planejar.");
    } finally {
      setBusy(false);
    }
  };

  const saveCharacter = async () => {
    if (!selectedMesa || !selectedStudent || !characterName.trim() || !currentCampaignId) return;
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
          campaignId: currentCampaignId || null,
          name: characterName,
          sheet,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a ficha.");
      setNotice("Personagem salvo no PostgreSQL Gerusa.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar ficha.");
    } finally {
      setBusy(false);
    }
  };

  const deleteLesson = async (lesson: Lesson) => {
    if (!window.confirm(`Excluir a aula “${lesson.title}”?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/gerusa/pedagogy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_lesson",
          lessonId: lesson.id,
          mesaId: selectedMesa,
          studentId: selectedStudent,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Esta aula não pode ser excluída.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao excluir.");
    } finally {
      setBusy(false);
    }
  };

  const duplicateLesson = async (lesson: Lesson) => {
    const copy: Draft = {
      title: `${lesson.title} (cópia)`,
      campaignId: lesson.campaignId,
      adventureId: lesson.adventureId,
      assignmentId: null,
      scheduledAt: "",
      status: "draft",
      objective: lesson.objective,
      grammar: lesson.grammar,
      vocabulary: lesson.vocabulary,
      durationMinutes: lesson.durationMinutes,
      outline: lesson.outline ?? [],
      notes: lesson.notes,
    };
    await saveLesson(copy);
  };

  return (
    <section
      id="master-sheets-panel"
      className="mx-auto mb-6 max-w-6xl rounded-2xl border border-[#742233]/50 bg-[#180b11] p-4 text-[#f5e9df] sm:p-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#742233]/40 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#d5a56c]">Central da professora</p>
          <h2 className="serif mt-1 text-2xl">Planejamento e fichas</h2>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Planejamento ou personagem">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "plan"}
            className={button}
            onClick={() => setTab("plan")}
          >
            Planejamento
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "character"}
            className={button}
            onClick={() => setTab("character")}
          >
            Personagem
          </button>
        </div>
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

      {tab === "plan" ? (
        <div className="mt-5 space-y-5">
          <form
            className="grid gap-3 rounded-xl border border-[#742233]/40 bg-[#10070b]/70 p-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void saveLesson(draft, editingId);
            }}
          >
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <h3 className="serif text-xl">
                {editingId ? "Editar aula" : "Preparar próxima aula"}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void generatePlan()}
                >
                  Gerusa, planeje a aula
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void generatePlan("next_lesson")}
                >
                  Sugerir próxima aula com histórico
                </button>
              </div>
            </div>
            <label className="text-sm">
              Data e horário
              <input
                aria-label="Data e horário da aula"
                type="datetime-local"
                className={field}
                value={draft.scheduledAt ?? ""}
                onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Título
              <input
                className={field}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={160}
              />
            </label>
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
                <option value="">Sem campanha</option>
                {activeCampaigns.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Status
              <select
                className={field}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as Lesson["status"] })}
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Objetivo
              <input
                className={field}
                value={draft.objective}
                onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Gramática
              <input
                className={field}
                value={draft.grammar}
                onChange={(e) => setDraft({ ...draft, grammar: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Vocabulário
              <textarea
                className={field}
                rows={2}
                value={draft.vocabulary}
                onChange={(e) => setDraft({ ...draft, vocabulary: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Duração (minutos)
              <input
                type="number"
                min={5}
                max={240}
                className={field}
                value={draft.durationMinutes ?? 45}
                onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              Aventura
              <select
                className={field}
                value={draft.adventureId ?? ""}
                onChange={(e) => setDraft({ ...draft, adventureId: e.target.value || null })}
              >
                <option value="">Nenhuma</option>
                {adventures.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Tarefa
              <select
                className={field}
                value={draft.assignmentId ?? ""}
                onChange={(e) => setDraft({ ...draft, assignmentId: e.target.value || null })}
              >
                <option value="">Nenhuma</option>
                {assignments.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Estrutura da aula
              <textarea
                className={field}
                rows={3}
                value={draft.outline
                  .map((item) => `${item.title} — ${item.activity} — ${item.prompt}`)
                  .join("\n")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    outline: e.target.value
                      .split("\n")
                      .filter(Boolean)
                      .map((line) => {
                        const [title, activity, prompt] = line
                          .split("—")
                          .map((part) => part.trim());
                        return {
                          title: title || line,
                          activity: activity || "",
                          prompt: prompt || "",
                        };
                      }),
                  })
                }
                placeholder="Uma atividade por linha: abertura — conversa — Tell me about your character"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Observações
              <textarea
                className={field}
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button type="submit" className={button} disabled={busy || !draft.campaignId}>
                {busy ? "Salvando…" : "Salvar aula"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    setEditingId(null);
                    setDraft({
                      ...emptyDraft(),
                      campaignId: selectedCampaignId || activeCampaigns[0]?.id || null,
                    });
                  }}
                >
                  Cancelar edição
                </button>
              ) : null}
            </div>
          </form>

          <div className="flex flex-wrap items-end gap-3">
            <h3 className="serif mr-auto text-xl">Aulas de {lessons[0]?.studentName || "aluno"}</h3>
            <label className="text-xs text-[#e7c9b7]/70">
              De
              <input
                type="date"
                className={field}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="text-xs text-[#e7c9b7]/70">
              Até
              <input
                type="date"
                className={field}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#742233]/40">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-[#220d15] text-xs uppercase tracking-wide text-[#d5a56c]">
                <tr>
                  {[
                    "Data / horário",
                    "Aluno / mesa",
                    "Sessão / objetivo",
                    "Gramática",
                    "Vocabulário",
                    "Aventura",
                    "Tarefa",
                    "Status",
                    "Observações",
                    "Ações",
                  ].map((item) => (
                    <th key={item} className="px-3 py-3">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleLessons.map((lesson) => (
                  <tr key={lesson.id} className="border-t border-[#742233]/30 align-top">
                    <td className="px-3 py-3">{localDate(lesson.scheduledAt)}</td>
                    <td className="px-3 py-3">{lesson.studentName}</td>
                    <td className="px-3 py-3">
                      <strong>{lesson.title}</strong>
                      <p className="mt-1 text-xs text-[#d5a56c]">
                        Campanha: {lesson.campaignName || "Sem campanha"}
                      </p>
                      <p className="mt-1 max-w-48 text-[#e7c9b7]/70">{lesson.objective}</p>
                    </td>
                    <td className="px-3 py-3">{lesson.grammar || "—"}</td>
                    <td className="px-3 py-3">{lesson.vocabulary || "—"}</td>
                    <td className="px-3 py-3">
                      {adventures.find((item) => item.id === lesson.adventureId)?.title || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {assignments.find((item) => item.id === lesson.assignmentId)?.title || "—"}
                    </td>
                    <td className="px-3 py-3">{labels[lesson.status]}</td>
                    <td className="px-3 py-3">{lesson.notes || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <button className={button} type="button" onClick={() => editLesson(lesson)}>
                          Editar
                        </button>
                        <button
                          className={button}
                          type="button"
                          onClick={() => void duplicateLesson(lesson)}
                          disabled={busy}
                        >
                          Duplicar
                        </button>
                        {lesson.status === "planned" || lesson.status === "draft" ? (
                          <button
                            className={button}
                            type="button"
                            onClick={() => {
                              editLesson(lesson);
                              onOpenSession(lesson.id);
                            }}
                          >
                            Abrir sessão
                          </button>
                        ) : null}
                        <button
                          className={button}
                          type="button"
                          onClick={() => void deleteLesson(lesson)}
                          disabled={busy}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visibleLessons.length ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-[#e7c9b7]/65">
                      Ainda não há aulas planejadas neste contexto.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            <h3 className="serif text-xl">Ficha do personagem</h3>
            <label className="text-sm">
              Nome
              <input
                className={field}
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
              />
            </label>
            {[
              ["appearance", "Aparência"],
              ["personality", "Personalidade"],
              ["backstory", "História"],
              ["goal", "Objetivo"],
              ["fear", "Medo"],
              ["relations", "Relações"],
              ["importantObjects", "Objetos importantes"],
              ["notes", "Notas"],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm">
                {label}
                <textarea
                  className={field}
                  rows={2}
                  value={sheet[key] ?? ""}
                  onChange={(e) => setSheet({ ...sheet, [key]: e.target.value })}
                />
              </label>
            ))}
            <button
              type="button"
              className={button}
              onClick={() => void saveCharacter()}
              disabled={busy || !characterName.trim() || !currentCampaignId}
            >
              Salvar ficha
            </button>
          </div>
          <aside className="rounded-xl border border-[#742233]/35 bg-[#10070b]/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#d5a56c]">Continuidade</p>
            <h3 className="serif mt-1 text-xl">Personagem persistente</h3>
            <p className="mt-2 text-sm text-[#e7c9b7]/70">
              A ficha pertence ao aluno e à mesa selecionados. O mesmo personagem acompanha as aulas
              seguintes.
            </p>
            {character ? (
              <p className="mt-4 text-sm">Última atualização: {localDate(character.updatedAt)}</p>
            ) : (
              <p className="mt-4 text-sm text-[#e7c9b7]/65">
                Ainda não há personagem salvo para este aluno.
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
