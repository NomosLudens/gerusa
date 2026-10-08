import { useCallback, useEffect, useState } from "react";

type Assignment = {
  id: string;
  studentId: string;
  studentName: string;
  lessonId: string | null;
  liveSessionId: string | null;
  adventureId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  taskType: string;
  title: string;
  prompt: string;
  content: Record<string, unknown>;
  status: string;
  dueAt: string | null;
  allowResubmit: boolean;
  studentResponse: string | null;
  submittedAt: string | null;
  teacherFeedback: string | null;
  reviewedAt: string | null;
};
type ReviewAnalysis = {
  summary: string;
  strengths: string[];
  corrections: Array<{ original: string; suggestion: string; reason: string }>;
  grammar_observations: string[];
  vocabulary_observations: string[];
  narrative_fidelity: string;
  pedagogical_next_step: string;
  suggested_feedback: string;
};
type Payload = {
  assignments?: Assignment[];
  lessons?: Array<{
    id: string;
    title: string;
    objective: string;
    grammar: string;
    vocabulary: string;
    adventureId: string | null;
    campaignId: string | null;
  }>;
  adventures?: Array<{ id: string; title: string; campaignId: string | null }>;
  sessions?: Array<{
    id: string;
    lessonId: string;
    campaignId: string | null;
    campaignName: string | null;
    characterName: string | null;
    adventureId: string | null;
    adventureTitle: string | null;
    startedAt: string;
  }>;
  mesa?: { campaigns?: Array<{ id: string; name: string; status: string }> };
  error?: string;
};
type Draft = {
  title: string;
  taskType: string;
  prompt: string;
  content: Record<string, unknown>;
  dueAt: string;
  allowResubmit: boolean;
  lessonId: string;
  liveSessionId: string;
  adventureId: string;
  campaignId: string;
};
const empty = (): Draft => ({
  title: "",
  taskType: "writing",
  prompt: "",
  content: {},
  dueAt: "",
  allowResubmit: true,
  lessonId: "",
  liveSessionId: "",
  adventureId: "",
  campaignId: "",
});
const field =
  "min-h-11 w-full rounded-lg border border-[#743044] bg-[#10070b] px-3 py-2 text-sm text-[#f5e9df] placeholder:text-[#e7c9b7]/40";
const button =
  "min-h-10 rounded-lg border border-[#8a3045]/70 px-3 text-sm hover:bg-[#742233]/25 disabled:opacity-50";
const taskTypes = [
  ["writing", "Escrita"],
  ["reading", "Leitura / interpretação"],
  ["vocabulary", "Vocabulário"],
  ["grammar", "Gramática"],
  ["sentences", "Completar frases"],
  ["questions", "Perguntas abertas"],
  ["quiz", "Quiz"],
  ["story_continuation", "Continuação narrativa"],
  ["character_diary", "Diário do personagem"],
];
function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function CharacterReviewQueue({
  mesaId,
  studentId,
  selectedCampaignId,
  onSelectedCampaignChange,
}: {
  mesaId?: string;
  studentId?: string;
  selectedCampaignId?: string;
  onSelectedCampaignChange: (campaignId: string) => void;
}) {
  const [payload, setPayload] = useState<Payload>({});
  const [draft, setDraft] = useState<Draft>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [proposalJson, setProposalJson] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [analyses, setAnalyses] = useState<Record<string, ReviewAnalysis>>({});
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const assignments = payload.assignments ?? [];
  const refresh = useCallback(async () => {
    if (!mesaId || !studentId) {
      setPayload({});
      return;
    }
    const query = new URLSearchParams({ view: "teacher", mesaId, studentId });
    const response = await fetch(`/api/gerusa/pedagogy?${query}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) throw new Error(data.error || "Não foi possível carregar as tarefas.");
    setPayload(data);
  }, [mesaId, studentId]);
  useEffect(() => {
    void refresh().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Falha ao carregar."),
    );
  }, [refresh]);
  useEffect(() => {
    setDraft(empty());
    setEditingId(null);
    setFeedback({});
    setAnalyses({});
    setAnalysisErrors({});
  }, [mesaId, studentId]);
  useEffect(() => {
    if (!editingId) {
      setDraft((current) => ({
        ...current,
        campaignId: selectedCampaignId || "",
        lessonId: "",
        liveSessionId: "",
        adventureId: "",
      }));
    }
  }, [editingId, selectedCampaignId]);
  const post = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/gerusa/pedagogy", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaId, studentId, ...body }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Ação não concluída.");
  };
  const save = async (value = draft, id = editingId) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let content: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(proposalJson || JSON.stringify(value.content));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          throw new Error("invalid");
        content = parsed as Record<string, unknown>;
      } catch {
        throw new Error("Revise o JSON do conteúdo antes de salvar.");
      }
      await post({
        action: "save_assignment",
        id,
        ...value,
        content,
        dueAt: value.dueAt || null,
        lessonId: value.lessonId || null,
        liveSessionId: value.liveSessionId || null,
        adventureId: value.adventureId || null,
        campaignId: value.campaignId || selectedCampaignId || null,
      });
      setDraft({ ...empty(), campaignId: selectedCampaignId || "" });
      setEditingId(null);
      setProposalJson("");
      await refresh();
      setNotice("Tarefa salva no PostgreSQL Gerusa.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    if (!mesaId || !studentId) return;
    if (!draft.campaignId || !draft.liveSessionId) {
      setError("Selecione a campanha e a sessão antes de gerar uma tarefa.");
      return;
    }
    const lessonId = draft.lessonId || payload.lessons?.[0]?.id;
    if (!lessonId) {
      setError("Vincule ou crie uma aula antes de gerar uma tarefa contextualizada.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/gerusa/action", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "task",
          mesaId,
          studentId,
          lessonId,
          fields: {
            campaignId: selectedCampaignId || null,
            liveSessionId: draft.liveSessionId || null,
            taskType: draft.taskType,
            title: draft.title,
            prompt: draft.prompt,
            adventureId: draft.adventureId || null,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        proposal?: {
          taskType: string;
          title: string;
          prompt: string;
          instructions: string[];
          expectedEvidence: string;
          grammarTarget: string;
          vocabulary: string[];
        };
        error?: string;
      };
      if (!response.ok || !data.proposal)
        throw new Error(data.error || "Gerusa não conseguiu gerar a tarefa.");
      setDraft((current) => ({
        ...current,
        taskType: data.proposal!.taskType,
        title: data.proposal!.title,
        prompt: data.proposal!.prompt,
        lessonId,
        content: {
          instructions: data.proposal!.instructions,
          expectedEvidence: data.proposal!.expectedEvidence,
          grammarTarget: data.proposal!.grammarTarget,
          vocabulary: data.proposal!.vocabulary,
        },
      }));
      setProposalJson(
        JSON.stringify(
          {
            instructions: data.proposal.instructions,
            expectedEvidence: data.proposal.expectedEvidence,
            grammarTarget: data.proposal.grammarTarget,
            vocabulary: data.proposal.vocabulary,
          },
          null,
          2,
        ),
      );
      setNotice(
        "Proposta da Gerusa carregada. Edite título, instruções e vínculo antes de salvar.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na geração.");
    } finally {
      setBusy(false);
    }
  };
  const edit = (item: Assignment) => {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      taskType: item.taskType,
      prompt: item.prompt,
      content: item.content,
      dueAt: localDateTime(item.dueAt),
      allowResubmit: item.allowResubmit,
      lessonId: item.lessonId ?? "",
      liveSessionId: item.liveSessionId ?? "",
      adventureId: item.adventureId ?? "",
      campaignId: item.campaignId ?? "",
    });
    if (item.campaignId) onSelectedCampaignChange(item.campaignId);
    setProposalJson(JSON.stringify(item.content, null, 2));
  };
  const act = async (item: Assignment, action: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post({ action, assignmentId: item.id, feedback: feedback[item.id] });
      await refresh();
      setNotice(
        action === "review_assignment"
          ? "Resposta corrigida e feedback salvo."
          : action === "publish_assignment"
            ? "Tarefa publicada para o aluno."
            : "Tarefa arquivada.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na tarefa.");
    } finally {
      setBusy(false);
    }
  };
  const analyzeSubmission = async (item: Assignment) => {
    if (!mesaId || !studentId || item.status !== "submitted" || !item.studentResponse) return;
    setAnalyzingId(item.id);
    setAnalysisErrors((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    try {
      const response = await fetch("/api/gerusa/action", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review_submission",
          mesaId,
          studentId,
          assignmentId: item.id,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        analysis?: ReviewAnalysis;
        error?: string;
      };
      if (!response.ok || !data.analysis) throw new Error(data.error || "analysis_unavailable");
      setAnalyses((current) => ({ ...current, [item.id]: data.analysis! }));
    } catch {
      setAnalysisErrors((current) => ({
        ...current,
        [item.id]: "A análise não foi concluída. A resposta continua salva; tente novamente.",
      }));
    } finally {
      setAnalyzingId(null);
    }
  };
  const updateAnalysis = (assignmentId: string, suggested_feedback: string) => {
    setAnalyses((current) => {
      const analysis = current[assignmentId];
      return analysis
        ? { ...current, [assignmentId]: { ...analysis, suggested_feedback } }
        : current;
    });
  };
  const incorporateFeedback = (item: Assignment, suggestion: string) => {
    setFeedback((current) => {
      const existing = current[item.id] ?? item.teacherFeedback ?? "";
      return {
        ...current,
        [item.id]: [existing.trim(), suggestion.trim()].filter(Boolean).join("\n\n"),
      };
    });
  };
  const discardAnalysis = (assignmentId: string) => {
    setAnalyses((current) => {
      const next = { ...current };
      delete next[assignmentId];
      return next;
    });
  };
  const updateProposal = (value: string) => {
    setProposalJson(value);
    try {
      setDraft((current) => ({
        ...current,
        content: JSON.parse(value) as Record<string, unknown>,
      }));
    } catch {
      /* preserve editor until valid JSON */
    }
  };
  return (
    <section
      className="mb-6 rounded-2xl border border-[#742233]/50 bg-[#180b11] p-4 text-[#f5e9df] sm:p-6"
      aria-label="Tarefas e respostas dos alunos"
    >
      <header className="border-b border-[#742233]/40 pb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#d5a56c]">Extensão da aula</p>
        <h2 className="serif mt-1 text-2xl">Tarefas e respostas</h2>
        <p className="mt-1 text-sm text-[#e7c9b7]/70">
          Atribuições e correções de {assignments[0]?.studentName ?? "aluno selecionado"}.
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
      <form
        className="mt-4 grid gap-3 rounded-xl border border-[#742233]/35 bg-[#10070b]/60 p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="serif text-xl">{editingId ? "Editar tarefa" : "Nova tarefa"}</h3>
          <button
            type="button"
            className={button}
            disabled={busy || !draft.campaignId || !draft.liveSessionId}
            onClick={() => void generate()}
          >
            Gerusa, gerar tarefa contextualizada
          </button>
        </div>
        <label className="text-sm">
          Campanha
          <select
            className={field}
            value={draft.campaignId}
            onChange={(event) => {
              const campaignId = event.target.value;
              onSelectedCampaignChange(campaignId);
              setDraft({ ...draft, campaignId, lessonId: "", liveSessionId: "", adventureId: "" });
            }}
          >
            <option value="">Sem campanha</option>
            {payload.mesa?.campaigns
              ?.filter((item) => item.status === "active")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Tipo
          <select
            className={field}
            value={draft.taskType}
            onChange={(e) => setDraft({ ...draft, taskType: e.target.value })}
          >
            {taskTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Título
          <input
            className={field}
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Instruções / proposta
          <textarea
            className={field}
            rows={3}
            required
            value={draft.prompt}
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Sessão da aula
          <select
            className={field}
            value={draft.liveSessionId}
            onChange={(event) => {
              const session = payload.sessions?.find((item) => item.id === event.target.value);
              const campaignId = session?.campaignId ?? "";
              onSelectedCampaignChange(campaignId);
              setDraft({
                ...draft,
                liveSessionId: event.target.value,
                lessonId: session?.lessonId ?? draft.lessonId,
                campaignId,
                adventureId: session?.adventureId ?? draft.adventureId,
              });
            }}
          >
            <option value="">Sem vínculo</option>
            {payload.sessions
              ?.filter((item) => !draft.campaignId || item.campaignId === draft.campaignId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.campaignName || "Sem campanha"} · {item.adventureTitle || "sessão"} ·{" "}
                  {localDateTime(item.startedAt)}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Aula
          <select
            className={field}
            value={draft.lessonId}
            onChange={(e) => setDraft({ ...draft, lessonId: e.target.value })}
          >
            <option value="">Sem vínculo</option>
            {payload.lessons
              ?.filter((item) => !draft.campaignId || item.campaignId === draft.campaignId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Aventura
          <select
            className={field}
            value={draft.adventureId}
            onChange={(e) => setDraft({ ...draft, adventureId: e.target.value })}
          >
            <option value="">Nenhuma</option>
            {payload.adventures
              ?.filter((item) => !draft.campaignId || item.campaignId === draft.campaignId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Prazo
          <input
            className={field}
            type="datetime-local"
            value={draft.dueAt}
            onChange={(e) => setDraft({ ...draft, dueAt: e.target.value })}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.allowResubmit}
            onChange={(e) => setDraft({ ...draft, allowResubmit: e.target.checked })}
          />{" "}
          Permitir reenvio após resposta
        </label>
        <label className="text-sm sm:col-span-2">
          Conteúdo estruturado (JSON)
          <textarea
            className={field + " font-mono text-xs"}
            rows={5}
            value={proposalJson || JSON.stringify(draft.content, null, 2)}
            onChange={(e) => updateProposal(e.target.value)}
          />
        </label>
        <div className="sm:col-span-2 flex gap-2">
          <button
            className={button}
            type="submit"
            disabled={
              busy ||
              !draft.title.trim() ||
              !draft.prompt.trim() ||
              !draft.campaignId ||
              !draft.liveSessionId
            }
          >
            Salvar tarefa
          </button>
          {editingId ? (
            <button
              className={button}
              type="button"
              onClick={() => {
                setDraft({ ...empty(), campaignId: selectedCampaignId || "" });
                setEditingId(null);
              }}
            >
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>
      <div className="mt-5 space-y-3">
        {assignments.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-[#742233]/40 bg-[#10070b]/50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#d5a56c]">
                  {taskTypes.find(([value]) => value === item.taskType)?.[1] ?? item.taskType} ·{" "}
                  {item.status} · {item.campaignName || "Sem campanha"}
                </p>
                <h3 className="serif text-xl">{item.title}</h3>
              </div>
              <p className="text-xs text-[#e7c9b7]/65">
                Prazo:{" "}
                {item.dueAt
                  ? new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.dueAt))
                  : "sem prazo"}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{item.prompt}</p>
            {item.studentResponse ? (
              <div className="mt-3 rounded-lg border border-[#8a3045]/30 bg-[#220d15] p-3">
                <p className="text-xs uppercase tracking-wide text-[#d5a56c]">
                  Resposta do aluno ·{" "}
                  {item.submittedAt ? new Date(item.submittedAt).toLocaleString("pt-BR") : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{item.studentResponse}</p>
                {(() => {
                  const lesson = payload.lessons?.find((entry) => entry.id === item.lessonId);
                  const session = payload.sessions?.find(
                    (entry) => entry.id === item.liveSessionId,
                  );
                  const grammarTarget =
                    typeof item.content.grammarTarget === "string"
                      ? item.content.grammarTarget
                      : lesson?.grammar;
                  const vocabularyTarget = Array.isArray(item.content.vocabulary)
                    ? item.content.vocabulary.map(String).join(", ")
                    : lesson?.vocabulary;
                  return lesson || grammarTarget || vocabularyTarget || session ? (
                    <dl className="mt-3 grid gap-2 rounded-lg border border-[#742233]/30 bg-[#10070b]/60 p-3 text-sm sm:grid-cols-2">
                      {lesson ? (
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-[#d5a56c]">
                            Objetivo pedagógico
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap">{lesson.objective || "—"}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-[#d5a56c]">
                          Gramática
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap">{grammarTarget || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-[#d5a56c]">
                          Vocabulário
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap">{vocabularyTarget || "—"}</dd>
                      </div>
                      {session ? (
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-[#d5a56c]">
                            Sessão vinculada
                          </dt>
                          <dd className="mt-1">
                            {[session.characterName, session.campaignName, session.adventureTitle]
                              .filter(Boolean)
                              .join(" · ") || new Date(session.startedAt).toLocaleString("pt-BR")}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null;
                })()}
                {item.teacherFeedback ? (
                  <p className="mt-3 rounded-lg border border-[#742233]/30 p-3 text-sm">
                    <strong>Feedback já salvo:</strong> {item.teacherFeedback}
                  </p>
                ) : null}
                <label className="mt-3 block text-sm">
                  Correção e feedback
                  <textarea
                    className={field}
                    rows={3}
                    value={feedback[item.id] ?? item.teacherFeedback ?? ""}
                    onChange={(e) => setFeedback({ ...feedback, [item.id]: e.target.value })}
                  />
                </label>
                {item.status === "submitted" ? (
                  <button
                    type="button"
                    className={button + " mt-2"}
                    disabled={analyzingId !== null || busy}
                    onClick={() => void analyzeSubmission(item)}
                  >
                    {analyzingId === item.id
                      ? "Gerusa está analisando…"
                      : analysisErrors[item.id]
                        ? "Tentar novamente"
                        : "Analisar com Gerusa"}
                  </button>
                ) : null}
                {analysisErrors[item.id] ? (
                  <p role="alert" className="mt-2 text-sm text-red-200">
                    {analysisErrors[item.id]}
                  </p>
                ) : null}
                {analyses[item.id] ? (
                  <section
                    className="mt-3 space-y-3 rounded-xl border border-[#8a3045]/40 bg-[#10070b]/70 p-4"
                    aria-label="Análise da Gerusa"
                  >
                    <header>
                      <p className="text-xs uppercase tracking-wide text-[#d5a56c]">
                        Sugestão para revisão da professora
                      </p>
                      <p className="mt-1 text-sm">{analyses[item.id].summary}</p>
                    </header>
                    <div>
                      <h4 className="text-sm font-medium">Pontos fortes</h4>
                      {analyses[item.id].strengths.length ? (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                          {analyses[item.id].strengths.map((entry, index) => (
                            <li key={index}>{entry}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-[#e7c9b7]/65">Nenhum ponto informado.</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Correções sugeridas</h4>
                      {analyses[item.id].corrections.length ? (
                        <ul className="mt-1 space-y-2 text-sm">
                          {analyses[item.id].corrections.map((entry, index) => (
                            <li key={index} className="rounded-lg border border-[#742233]/25 p-2">
                              <p>
                                <span className="text-[#e7c9b7]/65">Original:</span>{" "}
                                {entry.original}
                              </p>
                              <p>
                                <span className="text-[#e7c9b7]/65">Sugestão:</span>{" "}
                                {entry.suggestion}
                              </p>
                              <p className="mt-1 text-[#e7c9b7]/75">{entry.reason}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-[#e7c9b7]/65">Nenhuma correção apontada.</p>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["Observações gramaticais", analyses[item.id].grammar_observations],
                        ["Observações de vocabulário", analyses[item.id].vocabulary_observations],
                      ].map(([label, entries]) => (
                        <div key={label as string}>
                          <h4 className="text-sm font-medium">{label as string}</h4>
                          {(entries as string[]).length ? (
                            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                              {(entries as string[]).map((entry, index) => (
                                <li key={index}>{entry}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-sm text-[#e7c9b7]/65">Sem observações.</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <p className="text-sm">
                        <strong>Fidelidade narrativa:</strong>{" "}
                        {analyses[item.id].narrative_fidelity}
                      </p>
                      <p className="text-sm">
                        <strong>Próximo passo pedagógico:</strong>{" "}
                        {analyses[item.id].pedagogical_next_step}
                      </p>
                    </div>
                    <label className="block text-sm">
                      Feedback sugerido (editável)
                      <textarea
                        className={field + " mt-1"}
                        rows={4}
                        value={analyses[item.id].suggested_feedback}
                        onChange={(event) => updateAnalysis(item.id, event.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={button}
                        onClick={() =>
                          incorporateFeedback(item, analyses[item.id].suggested_feedback)
                        }
                        disabled={!analyses[item.id].suggested_feedback.trim()}
                      >
                        Incorporar ao feedback
                      </button>
                      <button
                        type="button"
                        className={button}
                        onClick={() => discardAnalysis(item.id)}
                      >
                        Ignorar análise
                      </button>
                    </div>
                  </section>
                ) : null}
                {item.status === "submitted" ? (
                  <button
                    type="button"
                    className={button + " mt-2"}
                    disabled={busy || !feedback[item.id]?.trim()}
                    onClick={() => void act(item, "review_assignment")}
                  >
                    Salvar correção
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {["draft", "published"].includes(item.status) ? (
                <button className={button} type="button" onClick={() => edit(item)}>
                  Editar
                </button>
              ) : null}
              {item.status === "draft" ? (
                <button
                  className={button}
                  type="button"
                  disabled={busy}
                  onClick={() => void act(item, "publish_assignment")}
                >
                  Publicar
                </button>
              ) : null}
              {item.status !== "archived" ? (
                <button
                  className={button}
                  type="button"
                  disabled={busy}
                  onClick={() => void act(item, "archive_assignment")}
                >
                  Arquivar
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!assignments.length ? (
          <p className="text-sm text-[#e7c9b7]/65">Nenhuma tarefa neste contexto ainda.</p>
        ) : null}
      </div>
    </section>
  );
}
