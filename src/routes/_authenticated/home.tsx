import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useProfile } from "@/lib/use-profile";

type StudentPayload = {
  context?: { mesaName: string; campaignName: string | null; campaignPremise: string | null };
  character?: { id: string; name: string; sheet: Record<string, string> } | null;
  adventures?: Array<{
    id: string;
    title: string;
    premise: string;
    pedagogicalObjective: string;
    grammarTarget: string;
    scenes: unknown[];
    conclusion: string;
    hook: string;
  }>;
  nextLesson?: {
    id: string;
    title: string;
    scheduledAt: string | null;
    objective: string;
    grammar: string;
  } | null;
  lessons?: Array<{
    id: string;
    title: string;
    status: string;
    scheduledAt: string | null;
    objective: string;
  }>;
  assignments?: Array<{
    id: string;
    taskType: string;
    title: string;
    prompt: string;
    content: Record<string, unknown>;
    status: string;
    dueAt: string | null;
    studentResponse: string | null;
    teacherFeedback: string | null;
    allowResubmit: boolean;
  }>;
  sessions?: Array<{
    id: string;
    lessonTitle: string;
    campaignName: string | null;
    characterName: string | null;
    adventureTitle: string | null;
    status: string;
    endedAt: string | null;
    summary: Record<string, unknown>;
  }>;
  records?: Array<{
    id: string;
    skill: string;
    progressStatus: string | null;
    observation: string;
    confirmed: boolean;
    createdAt: string;
  }>;
  threadId?: string | null;
  error?: string;
};
const field =
  "min-h-11 w-full rounded-lg border border-[#743044] bg-[#10070b] px-3 py-2 text-sm text-[#f5e9df]";
const button =
  "min-h-11 rounded-lg border border-[#8a3045]/60 bg-[#4c1425] px-4 text-sm hover:bg-[#641a30] disabled:opacity-50";

export const Route = createFileRoute("/_authenticated/home")({ component: StudentHome });

function StudentHome() {
  const { profile, mesas, loading, error } = useProfile();
  const [mesaId, setMesaId] = useState("");
  const [data, setData] = useState<StudentPayload>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    if (!mesaId && mesas.length)
      setMesaId(mesas.find((mesa) => mesa.member_role === "jogador")?.id ?? mesas[0].id);
  }, [mesaId, mesas]);
  const refresh = useCallback(async () => {
    if (!mesaId) {
      setData({});
      return;
    }
    const query = new URLSearchParams({ view: "student", mesaId });
    const response = await fetch(`/api/gerusa/pedagogy?${query}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const value = (await response.json().catch(() => ({}))) as StudentPayload;
    if (!response.ok) throw new Error(value.error || "Não foi possível carregar sua jornada.");
    setData(value);
    setResponses(
      Object.fromEntries(
        (value.assignments ?? []).map((item) => [item.id, item.studentResponse ?? ""]),
      ),
    );
  }, [mesaId]);
  useEffect(() => {
    void refresh().catch((cause) =>
      setActionError(cause instanceof Error ? cause.message : "Falha ao carregar."),
    );
  }, [refresh]);
  const submit = async (assignmentId: string) => {
    setBusy(assignmentId);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/gerusa/pedagogy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_assignment",
          assignmentId,
          response: responses[assignmentId],
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar a resposta.");
      await refresh();
      setNotice("Resposta salva e enviada à professora.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Falha ao enviar.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#10070b] px-4 py-6 pb-24 text-[#f5e9df] sm:px-8 sm:py-10">
      <main className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#742233]/45 bg-[#180b11] p-5">
          <div className="flex items-center gap-4">
            <img src="/gerusa-logo.png" alt="" className="h-14 w-14 rounded-full" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#d5a56c]">Jornada do aluno</p>
              <h1 className="serif mt-1 text-3xl">
                Olá, {profile?.display_name || "aventureiro"}.
              </h1>
            </div>
          </div>
          {mesas.length > 1 ? (
            <label className="text-sm">
              Sua mesa
              <select
                className={field + " mt-1"}
                value={mesaId}
                onChange={(e) => setMesaId(e.target.value)}
              >
                {mesas
                  .filter((item) => item.member_role === "jogador")
                  .map((mesa) => (
                    <option key={mesa.id} value={mesa.id}>
                      {mesa.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
        </header>
        {loading ? <p className="text-sm text-[#e7c9b7]/70">Carregando seu perfil…</p> : null}
        {error || actionError ? (
          <p role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm text-red-200">
            {actionError || "Não foi possível carregar seu perfil."}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="rounded-lg border border-[#8a3045]/40 p-3 text-sm text-[#f0c59a]"
          >
            {notice}
          </p>
        ) : null}
        {data.context ? (
          <section className="rounded-2xl border border-[#742233]/45 bg-[#180b11] p-5">
            <p className="text-xs uppercase tracking-wide text-[#d5a56c]">Sua campanha</p>
            <h2 className="serif mt-1 text-2xl">
              {data.context.campaignName || "Campanha em preparação"}
            </h2>
            {data.context.campaignPremise ? (
              <p className="mt-2 text-sm text-[#e7c9b7]/75">{data.context.campaignPremise}</p>
            ) : null}
            {data.character ? (
              <div className="mt-4 rounded-xl border border-[#742233]/35 bg-[#10070b]/60 p-4">
                <p className="text-xs uppercase tracking-wide text-[#d5a56c]">Seu personagem</p>
                <h3 className="serif mt-1 text-xl">{data.character.name}</h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ["appearance", "Aparência"],
                    ["personality", "Personalidade"],
                    ["backstory", "História"],
                    ["goal", "Objetivo"],
                    ["fear", "Medo"],
                    ["relations", "Relações"],
                    ["importantObjects", "Objetos importantes"],
                  ]
                    .filter(([key]) => data.character?.sheet?.[key])
                    .map(([key, label]) => (
                      <div key={key}>
                        <dt className="text-xs text-[#d5a56c]">{label}</dt>
                        <dd className="whitespace-pre-wrap text-sm">
                          {data.character?.sheet?.[key]}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#e7c9b7]/70">
                Sua personagem está sendo preparada pela professora.
              </p>
            )}
          </section>
        ) : null}
        {data.nextLesson ? (
          <section className="rounded-2xl border border-[#8a3045]/50 bg-[#220d15] p-5">
            <p className="text-xs uppercase tracking-wide text-[#d5a56c]">Próxima aula</p>
            <h2 className="serif mt-1 text-2xl">{data.nextLesson.title}</h2>
            <p className="mt-2 text-sm">{data.nextLesson.objective}</p>
            <p className="mt-1 text-xs text-[#e7c9b7]/70">
              {data.nextLesson.scheduledAt
                ? new Date(data.nextLesson.scheduledAt).toLocaleString("pt-BR")
                : "Data a combinar"}{" "}
              · {data.nextLesson.grammar}
            </p>
          </section>
        ) : null}
        {data.adventures?.length ? (
          <section className="rounded-2xl border border-[#742233]/45 bg-[#180b11] p-5">
            <p className="text-xs uppercase tracking-wide text-[#d5a56c]">Sua aventura</p>
            {data.adventures.slice(0, 2).map((adventure) => (
              <article
                key={adventure.id}
                className="mt-2 rounded-lg border border-[#742233]/30 p-3"
              >
                <h2 className="serif text-xl">{adventure.title}</h2>
                <p className="mt-1 text-sm text-[#e7c9b7]/80">{adventure.premise}</p>
                <p className="mt-2 text-xs text-[#d5a56c]">
                  Objetivo: {adventure.pedagogicalObjective} · {adventure.grammarTarget}
                </p>
              </article>
            ))}
          </section>
        ) : null}
        {data.sessions?.length ? (
          <section className="rounded-2xl border border-[#742233]/45 bg-[#180b11] p-5">
            <p className="text-xs uppercase tracking-wide text-[#d5a56c]">Continuidade</p>
            <div className="mt-2 space-y-2">
              {data.sessions.slice(0, 3).map((session) => (
                <article key={session.id} className="rounded-lg border border-[#742233]/30 p-3">
                  <h2 className="serif text-lg">{session.adventureTitle || session.lessonTitle}</h2>
                  <p className="mt-1 text-sm text-[#e7c9b7]/75">
                    {session.characterName || "Seu personagem"} ·{" "}
                    {session.campaignName || "Campanha"} ·{" "}
                    {session.status === "closed" ? "sessão concluída" : "sessão em andamento"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <section className="space-y-3">
          <h2 className="serif text-2xl">Tarefas</h2>
          {(data.assignments ?? []).map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#742233]/45 bg-[#180b11] p-5"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="serif text-xl">{item.title}</h3>
                <span className="text-xs text-[#d5a56c]">{item.status}</span>
              </div>
              {data.context?.campaignName ? (
                <p className="mt-1 text-xs text-[#e7c9b7]/65">
                  Campanha: {data.context.campaignName}
                </p>
              ) : null}
              <p className="mt-3 whitespace-pre-wrap text-sm">{item.prompt}</p>
              {item.content && Object.keys(item.content).length ? (
                <div className="mt-3 rounded-lg bg-[#10070b] p-3 text-sm">
                  {Array.isArray(item.content.instructions) ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {(item.content.instructions as string[]).map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                  {typeof item.content.expectedEvidence === "string" ? (
                    <p className="mt-2">Entregue: {item.content.expectedEvidence}</p>
                  ) : null}
                </div>
              ) : null}
              {item.status !== "archived" ? (
                <>
                  <label className="mt-3 block text-sm">
                    Sua resposta
                    <textarea
                      className={field + " mt-1"}
                      rows={5}
                      disabled={item.status === "reviewed" && !item.allowResubmit}
                      value={responses[item.id] ?? ""}
                      onChange={(e) => setResponses({ ...responses, [item.id]: e.target.value })}
                    />
                  </label>
                  {item.teacherFeedback ? (
                    <p className="mt-3 rounded-lg border border-[#d5a56c]/25 p-3 text-sm">
                      <strong>Feedback da professora:</strong> {item.teacherFeedback}
                    </p>
                  ) : null}
                  {["published", "submitted", "reviewed"].includes(item.status) ? (
                    <button
                      type="button"
                      className={button + " mt-3"}
                      disabled={
                        busy === item.id ||
                        !responses[item.id]?.trim() ||
                        item.status === "submitted" ||
                        (item.status === "reviewed" && !item.allowResubmit)
                      }
                      onClick={() => void submit(item.id)}
                    >
                      {busy === item.id
                        ? "Enviando…"
                        : item.status === "submitted"
                          ? "Enviada · aguardando correção"
                          : item.status === "reviewed"
                            ? "Reenviar resposta"
                            : "Enviar resposta"}
                    </button>
                  ) : null}
                </>
              ) : null}
            </article>
          ))}
          {!data.assignments?.length ? (
            <p className="rounded-xl border border-[#742233]/30 p-4 text-sm text-[#e7c9b7]/65">
              Você ainda não tem tarefas atribuídas.
            </p>
          ) : null}
        </section>
        <section className="rounded-2xl border border-[#742233]/40 bg-[#180b11] p-5">
          <h2 className="serif text-2xl">Últimas aulas</h2>
          <div className="mt-3 space-y-3">
            {(data.sessions ?? []).map((session) => (
              <details key={session.id} className="rounded-lg border border-[#742233]/30 p-3">
                <summary className="cursor-pointer">
                  {session.lessonTitle} ·{" "}
                  {session.endedAt
                    ? new Date(session.endedAt).toLocaleDateString("pt-BR")
                    : "em andamento"}
                </summary>
                <pre className="mt-3 whitespace-pre-wrap text-xs text-[#e7c9b7]/75">
                  {JSON.stringify(session.summary, null, 2)}
                </pre>
              </details>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {(data.records ?? [])
              .filter((item) => item.confirmed)
              .slice(0, 5)
              .map((record) => (
                <p key={record.id} className="rounded-lg bg-[#10070b] p-3 text-sm">
                  <strong>{record.skill || "Progresso"}</strong>
                  {record.progressStatus ? ` · ${record.progressStatus}` : ""} —{" "}
                  {record.observation}
                </p>
              ))}
          </div>
        </section>
        <Link
          to="/conversa"
          className="block rounded-xl border border-[#8a3045]/60 bg-[#4c1425] p-5 transition hover:bg-[#641a30]"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-[#f0c59a]">Conversa</p>
          <h2 className="serif mt-1 text-2xl">Falar com Gerusa</h2>
          <p className="mt-2 text-sm text-[#f5e9df]/75">Seu histórico fica salvo na sua conta.</p>
        </Link>
      </main>
    </div>
  );
}
