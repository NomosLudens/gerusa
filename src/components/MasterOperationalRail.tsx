import { useCallback, useEffect, useState } from "react";
type Payload = {
  lessons?: Array<{
    id: string;
    title: string;
    scheduledAt: string | null;
    status: string;
    grammar: string;
  }>;
  assignments?: Array<{ id: string; title: string; status: string }>;
  records?: Array<{ skill: string; observation: string; createdAt: string }>;
  sessions?: Array<{ lessonId: string; endedAt: string | null }>;
  error?: string;
};
const button =
  "min-h-11 rounded-lg border border-[#8a3045]/60 px-3 text-left text-sm hover:bg-[#742233]/25";
export function MasterOperationalRail({
  mesaId,
  studentId,
  onNavigate,
}: {
  mesaId: string | null;
  studentId?: string;
  onNavigate: (tab: string) => void;
}) {
  const [payload, setPayload] = useState<Payload>({});
  const [error, setError] = useState("");
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
    if (!response.ok) throw new Error(data.error || "Não foi possível carregar o contexto rápido.");
    setPayload(data);
    setError("");
  }, [mesaId, studentId]);
  useEffect(() => {
    void refresh().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Falha ao carregar."),
    );
  }, [refresh]);
  const lessons = payload.lessons ?? [];
  const nextLesson =
    lessons.find((item) => item.status === "planned") ??
    lessons.find((item) => item.status === "draft");
  const pending = (payload.assignments ?? []).find((item) =>
    ["draft", "published", "submitted"].includes(item.status),
  );
  const lastRecord = payload.records?.[0];
  return (
    <aside
      id="master-operational-rail"
      aria-label="Contexto rápido da professora"
      className="mb-6 rounded-2xl border border-[#742233]/45 bg-[#180b11] p-4 text-[#f5e9df]"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-[#d5a56c]">Contexto rápido</p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      ) : !studentId ? (
        <p className="mt-3 text-sm text-[#e7c9b7]/65">
          Selecione um aluno para ver a próxima ação.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-lg border border-[#742233]/30 p-3">
              <p className="text-xs text-[#d5a56c]">Próxima aula</p>
              <p className="mt-1 text-sm">{nextLesson?.title ?? "Planejar uma aula"}</p>
            </article>
            <article className="rounded-lg border border-[#742233]/30 p-3">
              <p className="text-xs text-[#d5a56c]">Gramática atual</p>
              <p className="mt-1 text-sm">
                {nextLesson?.grammar || lessons[0]?.grammar || "A definir"}
              </p>
            </article>
            <article className="rounded-lg border border-[#742233]/30 p-3">
              <p className="text-xs text-[#d5a56c]">Tarefa pendente</p>
              <p className="mt-1 text-sm">{pending?.title ?? "Nenhuma"}</p>
            </article>
            <article className="rounded-lg border border-[#742233]/30 p-3">
              <p className="text-xs text-[#d5a56c]">Última dificuldade / observação</p>
              <p className="mt-1 line-clamp-2 text-sm">
                {lastRecord?.observation ?? "Sem registros"}
              </p>
            </article>
            <article className="rounded-lg border border-[#742233]/30 p-3">
              <p className="text-xs text-[#d5a56c]">Última sessão</p>
              <p className="mt-1 text-sm">
                {payload.sessions?.find((item) => item.endedAt)?.endedAt
                  ? new Date(
                      payload.sessions.find((item) => item.endedAt)!.endedAt!,
                    ).toLocaleDateString("pt-BR")
                  : "Sem aulas concluídas"}
              </p>
            </article>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button className={button} onClick={() => onNavigate("planning")}>
              Preparar aula
            </button>
            <button className={button} onClick={() => onNavigate("tasks")}>
              Nova tarefa
            </button>
            <button className={button} onClick={() => onNavigate("planning")}>
              Abrir personagem
            </button>
            <button className={button} onClick={() => onNavigate("adventures")}>
              Abrir histórico
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
