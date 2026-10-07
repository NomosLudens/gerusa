import { useEffect, useMemo, useState } from "react";

type Mesa = { id: string; slug: string; name: string };
type Student = {
  id: string;
  name: string | null;
  mesaId: string;
  mesaName: string;
  threadId: string | null;
};
type Campaign = { id: string; mesaId: string; mesaName: string; name: string; status: string };
type Summary = { mesas?: Mesa[]; players?: Student[]; campaigns?: Campaign[]; error?: string };

export function MasterCommandCenter({
  selectedMesa,
  onSelectedMesaChange,
}: {
  selectedMesa?: string;
  onSelectedMesaChange: (mesaId: string) => void;
}) {
  const [summary, setSummary] = useState<Summary>({});
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/master/characters", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Summary;
        if (!response.ok) throw new Error(data.error || "master_summary_failed");
        if (active) {
          setSummary(data);
          if (!selectedMesa && data.mesas?.[0]) onSelectedMesaChange(data.mesas[0].id);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedMesa, onSelectedMesaChange]);

  const mesas = summary.mesas ?? [];
  const mesaId = selectedMesa && selectedMesa !== "all" ? selectedMesa : null;
  const mesa = mesas.find((item) => item.id === mesaId) ?? null;
  const students = useMemo(
    () => (summary.players ?? []).filter((student) => !mesaId || student.mesaId === mesaId),
    [summary.players, mesaId],
  );
  const campaigns = (summary.campaigns ?? []).filter(
    (campaign) => !mesaId || campaign.mesaId === mesaId,
  );

  return (
    <section
      className="mb-6 rounded-2xl border border-[#742233]/50 bg-[#180b11] p-5 text-[#f5e9df]"
      aria-label="Painel da Professora"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#742233]/40 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#d5a56c]">Gerusa · Professora</p>
          <h1 className="serif mt-1 text-3xl">Mesa de histórias</h1>
        </div>
        <label className="min-w-56 text-xs uppercase tracking-[0.15em] text-[#e7c9b7]/70">
          Campanha / grupo
          <select
            value={selectedMesa ?? ""}
            onChange={(event) => onSelectedMesaChange(event.target.value)}
            disabled={loading || !mesas.length}
            aria-label="Selecionar campanha ou grupo"
            className="mt-2 min-h-11 w-full rounded-lg border border-[#743044] bg-[#10070b] px-3 text-sm normal-case tracking-normal text-[#f5e9df]"
          >
            {mesas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </header>
      {error ? (
        <p role="alert" className="mt-4 rounded border border-red-400/30 p-3 text-sm text-red-200">
          Não foi possível carregar os vínculos da professora.
        </p>
      ) : null}
      {loading ? <p className="mt-4 text-sm text-[#e7c9b7]/70">Carregando seus alunos…</p> : null}
      {!loading && !error ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <article className="rounded-xl border border-[#742233]/40 bg-[#220d15] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#d5a56c]">Campanha</p>
              <h2 className="serif mt-1 text-xl">
                {campaigns[0]?.name ?? mesa?.name ?? "Sem campanha ativa"}
              </h2>
              <p className="mt-1 text-sm text-[#e7c9b7]/65">{mesa?.name ?? "Selecione um grupo"}</p>
            </article>
            <article className="rounded-xl border border-[#742233]/40 bg-[#220d15] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#d5a56c]">
                Alunos vinculados
              </p>
              <p className="serif mt-1 text-xl">{students.length}</p>
              <p className="mt-1 text-sm text-[#e7c9b7]/65">
                Acesso restrito às mesas da professora.
              </p>
            </article>
          </div>
          <section className="mt-5" aria-label="Lista de alunos">
            <h2 className="serif text-xl">Alunos</h2>
            {students.length ? (
              <ul className="mt-2 divide-y divide-[#742233]/35 rounded-xl border border-[#742233]/40">
                {students.map((student) => (
                  <li
                    key={`${student.id}:${student.mesaId}`}
                    className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <span>{student.name || "Aluno"}</span>
                    <span className="flex items-center gap-3 text-[#e7c9b7]/65">
                      {student.mesaName}
                      {student.threadId ? (
                        <a
                          className="text-[#e7a4a7] underline decoration-[#a13c4c]/70 underline-offset-4 hover:text-[#ffd6cc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dc6170]"
                          href={`/conversa/${student.threadId}`}
                        >
                          Abrir conversa
                        </a>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#e7c9b7]/65">Nenhum aluno vinculado a esta mesa.</p>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
