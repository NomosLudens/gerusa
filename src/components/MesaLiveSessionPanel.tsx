import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Lesson = {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  mesaId: string;
  status: string;
  scheduledAt: string | null;
  objective: string;
  grammar: string;
  vocabulary: string;
  outline: Array<{ title: string; activity: string; prompt: string }>;
  adventureId: string | null;
};
type Session = {
  id: string;
  lessonId: string;
  studentId: string;
  status: "live" | "closed";
  currentSceneIndex: number;
  quickNotes: string;
  summary: Record<string, unknown>;
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
};
type RecordItem = {
  id: string;
  lessonId: string;
  liveSessionId: string | null;
  recordType: string;
  skill: string;
  progressStatus: string | null;
  observation: string;
  evidence: string;
  confirmed: boolean;
  createdAt: string;
};
type Payload = {
  lessons?: Lesson[];
  sessions?: Session[];
  records?: RecordItem[];
  adventures?: Array<{
    id: string;
    title: string;
    scenes: unknown[];
    grammarTarget: string;
    vocabulary: unknown[];
    npcs: unknown[];
  }>;
  error?: string;
};
type Summary = {
  narrativeSummary: string;
  pedagogicalSummary: string;
  grammar: string;
  vocabulary: string;
  strengths: string;
  difficulties: string;
  suggestedTask: string;
  nextStep: string;
};
type Proposal = { action: string; value: unknown };

const field =
  "min-h-11 w-full rounded-lg border border-[#743044] bg-[#10070b] px-3 py-2 text-sm text-[#f5e9df] placeholder:text-[#e7c9b7]/40";
const button =
  "min-h-10 rounded-lg border border-[#8a3045]/70 px-3 text-sm text-[#f5e9df] hover:bg-[#742233]/25 disabled:opacity-50";
const recordTypes = [
  ["success", "Acerto / ponto forte"],
  ["difficulty", "Dificuldade"],
  ["new_vocabulary", "Vocabulário novo"],
  ["recurring_error", "Erro recorrente"],
  ["observation", "Observação"],
  ["narrative", "Acontecimento narrativo"],
  ["task_suggestion", "Tarefa sugerida"],
] as const;
const blankSummary = (): Summary => ({
  narrativeSummary: "",
  pedagogicalSummary: "",
  grammar: "",
  vocabulary: "",
  strengths: "",
  difficulties: "",
  suggestedTask: "",
  nextStep: "",
});
const asText = (value: unknown) => (typeof value === "string" ? value : "");
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
function summaryFields(value: Record<string, unknown> | undefined): Summary {
  const source = value ?? {};
  const asLines = (item: unknown) =>
    Array.isArray(item) ? item.map(String).join("\n") : typeof item === "string" ? item : "";
  return {
    narrativeSummary: asLines(source.narrativeSummary),
    pedagogicalSummary: asLines(source.pedagogicalSummary),
    grammar: asLines(source.grammar),
    vocabulary: asLines(source.vocabulary),
    strengths: asLines(source.strengths),
    difficulties: asLines(source.difficulties),
    suggestedTask: asLines(source.suggestedTask),
    nextStep: asLines(source.nextStep),
  };
}

export function MesaLiveSessionPanel({
  mesaId,
  studentId,
  focusLessonId,
}: {
  mesaId?: string;
  studentId?: string;
  focusLessonId?: string;
}) {
  const [payload, setPayload] = useState<Payload>({});
  const [selectedLessonId, setSelectedLessonId] = useState(focusLessonId ?? "");
  const [quickType, setQuickType] = useState<(typeof recordTypes)[number][0]>("observation");
  const [quickObservation, setQuickObservation] = useState("");
  const [quickEvidence, setQuickEvidence] = useState("");
  const [quickSkill, setQuickSkill] = useState("");
  const [progressStatus, setProgressStatus] = useState("developing");
  const [summary, setSummary] = useState<Summary>(blankSummary());
  const [summaryEdited, setSummaryEdited] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [proposalJson, setProposalJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const lessons = useMemo(() => payload.lessons ?? [], [payload.lessons]);
  const sessions = useMemo(() => payload.sessions ?? [], [payload.sessions]);
  const records = payload.records ?? [];
  const adventures = payload.adventures ?? [];
  const liveSession = sessions.find((session) => session.status === "live") ?? null;
  const selectedLesson =
    lessons.find((lesson) => lesson.id === (liveSession?.lessonId ?? selectedLessonId)) ?? null;
  const adventure = adventures.find((item) => item.id === selectedLesson?.adventureId) ?? null;
  const scenes = adventure?.scenes ?? selectedLesson?.outline ?? [];
  const sceneIndex = liveSession?.currentSceneIndex ?? 0;
  const currentScene = (scenes[sceneIndex] ?? null) as Record<string, unknown> | null;
  const recentSessions = useMemo(
    () => sessions.filter((session) => session.status === "closed").slice(0, 10),
    [sessions],
  );

  useEffect(() => {
    if (focusLessonId) setSelectedLessonId(focusLessonId);
  }, [focusLessonId]);

  const refresh = useCallback(async () => {
    if (!mesaId || !studentId) {
      setPayload({});
      return;
    }
    try {
      const query = new URLSearchParams({ view: "teacher", mesaId, studentId });
      const response = await fetch(`/api/gerusa/pedagogy?${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as Payload;
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar a aula.");
      setPayload(data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar a aula.");
    }
  }, [mesaId, studentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (liveSession && !summaryEdited) setSummary(summaryFields(liveSession.summary));
  }, [liveSession, summaryEdited]);

  useEffect(() => {
    if (!liveSession && !selectedLessonId) {
      setSelectedLessonId(
        lessons.find((lesson) => lesson.status === "planned")?.id ?? lessons[0]?.id ?? "",
      );
    }
  }, [lessons, liveSession, selectedLessonId]);

  const post = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/gerusa/pedagogy", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaId, studentId, ...body }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Ação não concluída.");
    return data;
  };

  const start = async () => {
    if (!selectedLessonId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post({ action: "start_session", lessonId: selectedLessonId });
      await refresh();
      setNotice("Aula iniciada e registrada no PostgreSQL Gerusa.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar.");
    } finally {
      setBusy(false);
    }
  };

  const saveQuickNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!liveSession || !selectedLesson || !quickObservation.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post({
        action: "record_observation",
        lessonId: selectedLesson.id,
        sessionId: liveSession.id,
        recordType: quickType,
        observation: quickObservation,
        evidence: quickEvidence,
        skill: quickSkill,
      });
      setQuickObservation("");
      setQuickEvidence("");
      await refresh();
      setNotice("Registro pedagógico salvo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  };

  const saveProgress = async () => {
    if (!liveSession || !selectedLesson || !quickObservation.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post({
        action: "save_progress",
        lessonId: selectedLesson.id,
        sessionId: liveSession.id,
        skill: quickSkill,
        progressStatus,
        observation: quickObservation,
        evidence: quickEvidence,
        confirmed: true,
      });
      setQuickObservation("");
      setQuickEvidence("");
      await refresh();
      setNotice("Progresso confirmado e salvo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar progresso.");
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: string) => {
    if (!selectedLesson || !mesaId || !studentId) return;
    setBusy(true);
    setError("");
    setNotice("");
    setProposal(null);
    try {
      const response = await fetch("/api/gerusa/action", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          mesaId,
          studentId,
          lessonId: selectedLesson.id,
          fields: { scene: currentScene, notes: liveSession?.quickNotes ?? "" },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        proposal?: unknown;
        error?: string;
      };
      if (!response.ok || !data.proposal)
        throw new Error(data.error || "Gerusa não conseguiu gerar a proposta.");
      setProposal({ action, value: data.proposal });
      setProposalJson(JSON.stringify(data.proposal, null, 2));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao consultar Gerusa.");
    } finally {
      setBusy(false);
    }
  };

  const saveProposal = async () => {
    if (!proposal || !liveSession || !selectedLesson) return;
    let value: unknown;
    try {
      value = JSON.parse(proposalJson);
    } catch {
      setError("Revise a estrutura JSON antes de salvar.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const text =
        typeof value === "object" && value !== null && "title" in value
          ? String((value as { title: unknown }).title)
          : proposal.action.replaceAll("_", " ");
      await post({
        action: "record_observation",
        lessonId: selectedLesson.id,
        sessionId: liveSession.id,
        recordType: "narrative",
        observation: `${text}: proposta Gerusa aprovada pela professora.`,
        evidence: JSON.stringify(value),
      });
      await post({
        action: "update_session",
        sessionId: liveSession.id,
        quickNotes: liveSession.quickNotes,
        currentSceneIndex: sceneIndex + 1,
      });
      setProposal(null);
      await refresh();
      setNotice("Proposta editada e registrada nesta aula.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar a proposta.");
    } finally {
      setBusy(false);
    }
  };

  const updateQuickNotes = async (value: string) => {
    if (!liveSession) return;
    try {
      await post({
        action: "update_session",
        sessionId: liveSession.id,
        quickNotes: value,
        currentSceneIndex: sceneIndex,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a nota.");
    }
  };

  const generateSummary = async () => {
    await runAction("lesson_summary");
  };

  const saveSummary = async (closeSession = false) => {
    if (!liveSession) return;
    setBusy(true);
    setError("");
    setNotice("");
    const storedSummary = {
      ...summary,
      grammar: summary.grammar.split("\n").filter(Boolean),
      vocabulary: summary.vocabulary.split("\n").filter(Boolean),
      strengths: summary.strengths.split("\n").filter(Boolean),
      difficulties: summary.difficulties.split("\n").filter(Boolean),
    };
    try {
      await post({
        action: closeSession ? "close_session" : "save_summary",
        sessionId: liveSession.id,
        summary: storedSummary,
      });
      setSummaryEdited(false);
      await refresh();
      setNotice(closeSession ? "Aula encerrada; resumo e continuidade salvos." : "Resumo salvo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o resumo.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (proposal?.action === "lesson_summary") {
      try {
        setSummary(summaryFields(JSON.parse(proposalJson) as Record<string, unknown>));
        setSummaryEdited(true);
        setProposal(null);
      } catch {
        /* The proposal stays available for editing if it is not valid JSON. */
      }
    }
  }, [proposal, proposalJson]);

  return (
    <section
      className="mx-auto mb-6 max-w-6xl rounded-2xl border border-[#742233]/50 bg-[#180b11] p-4 text-[#f5e9df] sm:p-6"
      aria-label="Aula ao vivo"
    >
      <header className="border-b border-[#742233]/40 pb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#d5a56c]">
          Mesa live session · aula RPG
        </p>
        <h2 className="serif mt-1 text-2xl">Aula ao vivo</h2>
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
      {!liveSession ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-sm">
            Aula planejada
            <select
              aria-label="Aula planejada"
              className={field}
              value={selectedLessonId}
              onChange={(event) => setSelectedLessonId(event.target.value)}
            >
              <option value="">Selecione uma aula</option>
              {lessons
                .filter((lesson) => ["draft", "planned"].includes(lesson.status))
                .map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title} · {lesson.studentName} ·{" "}
                    {lesson.scheduledAt ? dateLabel(lesson.scheduledAt) : "sem data"}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className={button}
            disabled={busy || !selectedLessonId}
            onClick={() => void start()}
          >
            Iniciar aula
          </button>
        </div>
      ) : null}
      {liveSession && selectedLesson ? (
        <div className="mt-5 space-y-4">
          <section className="rounded-xl border border-[#8a3045]/45 bg-[#10070b]/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#d5a56c]">
                  Aula em andamento · {dateLabel(liveSession.startedAt)}
                </p>
                <h3 className="serif mt-1 text-xl">
                  {selectedLesson.studentName} · {selectedLesson.title}
                </h3>
                <p className="mt-1 text-sm text-[#e7c9b7]/70">{selectedLesson.objective}</p>
                <p className="mt-2 text-sm">
                  Gramática: {selectedLesson.grammar || "—"} · Vocabulário:{" "}
                  {selectedLesson.vocabulary || "—"}
                </p>
              </div>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => void generateSummary()}
              >
                Gerusa, resumir aula
              </button>
            </div>
          </section>
          <section className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-xl border border-[#742233]/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="serif text-xl">Cena atual</h3>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void runAction("scene")}
                >
                  Gerar continuação
                </button>
              </div>
              {currentScene ? (
                <div className="mt-3 rounded-lg bg-[#10070b] p-3">
                  <strong>{asText(currentScene.title) || `Cena ${sceneIndex + 1}`}</strong>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#e7c9b7]/80">
                    {asText(currentScene.activity) ||
                      asText(currentScene.description) ||
                      asText(currentScene.prompt) ||
                      "Cena planejada"}
                  </p>
                  <p className="mt-2 text-sm text-[#f0c59a]">
                    Pergunta: {asText(currentScene.prompt) || "—"}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#e7c9b7]/65">
                  A aula ainda não tem cenas planejadas. Gerusa pode preparar a próxima.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["challenge", "Criar desafio"],
                  ["npc", "Improvisar NPC"],
                  ["dialogue", "Gerar diálogo"],
                  ["quiz", "Gerar quiz"],
                  ["grammar_explanation", "Explicar gramática"],
                  ["simplify_text", "Simplificar inglês"],
                  ["increase_difficulty", "Aumentar dificuldade"],
                ].map(([action, label]) => (
                  <button
                    key={action}
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => void runAction(action)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <form
              className="rounded-xl border border-[#742233]/40 p-4"
              onSubmit={(event) => void saveQuickNote(event)}
            >
              <h3 className="serif text-xl">Registro rápido</h3>
              <div className="mt-3 grid gap-3">
                <label className="text-sm">
                  Tipo
                  <select
                    className={field}
                    value={quickType}
                    onChange={(e) => setQuickType(e.target.value as typeof quickType)}
                  >
                    {recordTypes.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  O que observou?
                  <textarea
                    className={field}
                    rows={3}
                    value={quickObservation}
                    onChange={(e) => setQuickObservation(e.target.value)}
                    required
                  />
                </label>
                <label className="text-sm">
                  Evidência / vocabulário
                  <textarea
                    className={field}
                    rows={2}
                    value={quickEvidence}
                    onChange={(e) => setQuickEvidence(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Habilidade ou gramática
                  <input
                    className={field}
                    value={quickSkill}
                    onChange={(e) => setQuickSkill(e.target.value)}
                    placeholder="Speaking, Past Simple…"
                  />
                </label>
                <button
                  type="submit"
                  className={button}
                  disabled={busy || !quickObservation.trim()}
                >
                  Salvar observação
                </button>
              </div>
            </form>
          </section>
          <label className="block text-sm">
            Notas rápidas da professora
            <textarea
              className={field}
              rows={2}
              defaultValue={liveSession.quickNotes}
              key={liveSession.id}
              onBlur={(event) => void updateQuickNotes(event.target.value)}
            />
          </label>
          <section className="rounded-xl border border-[#742233]/40 p-4">
            <h3 className="serif text-xl">Progresso confirmado</h3>
            <p className="mt-1 text-xs text-[#e7c9b7]/65">
              A professora confirma a atualização; a evidência fica vinculada à aula.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                className={field}
                value={quickSkill}
                onChange={(e) => setQuickSkill(e.target.value)}
                placeholder="Speaking, Reading…"
              />
              <select
                className={field}
                value={progressStatus}
                onChange={(e) => setProgressStatus(e.target.value)}
              >
                <option value="emerging">Emergente</option>
                <option value="developing">Em desenvolvimento</option>
                <option value="secure">Consolidado</option>
                <option value="not_observed">Não observado</option>
              </select>
              <button
                type="button"
                className={button}
                disabled={busy || !quickObservation.trim()}
                onClick={() => void saveProgress()}
              >
                Confirmar progresso da observação acima
              </button>
            </div>
          </section>
          {proposal ? (
            <section className="rounded-xl border border-[#d5a56c]/35 bg-[#220d15] p-4">
              <h3 className="serif text-xl">Proposta estruturada da Gerusa</h3>
              <p className="mt-1 text-xs text-[#e7c9b7]/65">
                Edite o JSON da proposta antes de registrá-la na aula.
              </p>
              <textarea
                aria-label="Proposta editável da Gerusa"
                className={field + " mt-3 font-mono text-xs"}
                rows={12}
                value={proposalJson}
                onChange={(e) => setProposalJson(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <button
                  className={button}
                  type="button"
                  disabled={busy}
                  onClick={() => void saveProposal()}
                >
                  Adicionar à aula
                </button>
                <button className={button} type="button" onClick={() => setProposal(null)}>
                  Descartar proposta
                </button>
              </div>
            </section>
          ) : null}
          <section className="rounded-xl border border-[#742233]/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="serif text-xl">Resumo pós-aula</h3>
              <button
                className={button}
                type="button"
                disabled={busy}
                onClick={() => void runAction("lesson_summary")}
              >
                Gerar resumo estruturado
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["narrativeSummary", "Resumo narrativo"],
                ["pedagogicalSummary", "Resumo pedagógico"],
                ["grammar", "Gramática trabalhada"],
                ["vocabulary", "Vocabulário"],
                ["strengths", "Pontos fortes"],
                ["difficulties", "Dificuldades"],
                ["suggestedTask", "Tarefa sugerida"],
                ["nextStep", "Próximo passo"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm">
                  {label}
                  <textarea
                    className={field}
                    rows={key.includes("Summary") ? 3 : 2}
                    value={summary[key as keyof Summary]}
                    onChange={(e) => {
                      setSummary({ ...summary, [key]: e.target.value });
                      setSummaryEdited(true);
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={button}
                type="button"
                disabled={busy}
                onClick={() => void saveSummary(false)}
              >
                Salvar resumo
              </button>
              <button
                className={button}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Encerrar esta aula e guardar o resumo?"))
                    void saveSummary(true);
                }}
              >
                Encerrar aula
              </button>
            </div>
          </section>
          <section className="rounded-xl border border-[#742233]/40 p-4">
            <h3 className="serif text-xl">Registros desta aula</h3>
            <ul className="mt-3 space-y-2">
              {records
                .filter((item) => item.lessonId === selectedLesson.id)
                .map((item) => (
                  <li key={item.id} className="rounded-lg bg-[#10070b] p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="text-sm">
                        {recordTypes.find(([type]) => type === item.recordType)?.[1] ??
                          item.recordType}
                      </strong>
                      <time className="text-xs text-[#e7c9b7]/60">{dateLabel(item.createdAt)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{item.observation}</p>
                    {item.evidence ? (
                      <p className="mt-1 text-xs text-[#e7c9b7]/70">Evidência: {item.evidence}</p>
                    ) : null}
                  </li>
                ))}
              {!records.some((item) => item.lessonId === selectedLesson.id) ? (
                <li className="text-sm text-[#e7c9b7]/65">Nenhum registro nesta aula ainda.</li>
              ) : null}
            </ul>
          </section>
        </div>
      ) : null}
      {recentSessions.length ? (
        <section className="mt-6 border-t border-[#742233]/40 pt-4">
          <h3 className="serif text-xl">Aulas anteriores</h3>
          <div className="mt-3 space-y-2">
            {recentSessions.map((session) => (
              <details key={session.id} className="rounded-lg border border-[#742233]/35 p-3">
                <summary className="cursor-pointer">
                  {lessons.find((lesson) => lesson.id === session.lessonId)?.title ?? "Aula"} ·{" "}
                  {dateLabel(session.endedAt ?? session.startedAt)}
                </summary>
                <pre className="mt-3 whitespace-pre-wrap text-xs text-[#e7c9b7]/75">
                  {JSON.stringify(session.summary, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
