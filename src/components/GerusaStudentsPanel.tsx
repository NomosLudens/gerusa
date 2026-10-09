import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type Student = {
  id: string;
  name: string;
  age: number | null;
  username: string;
  status: string;
  mesaId: string;
  mesaName: string;
  campaignName: string | null;
  lastAccess: string | null;
};
type Mesa = { id: string; name: string };
type Campaign = { id: string; mesaId: string; name: string };
type Summary = { mesas?: Mesa[]; campaigns?: Campaign[] };

const usernamePattern = /^[a-z0-9][a-z0-9_\x2d]{2,31}$/;
const usernameHtmlPattern = "[a-z0-9][a-z0-9_\\x2d]{2,31}";

function makePin() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}
function suggestedUsername(name: string) {
  const first =
    name
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/\s+/)[0] ?? "";
  const base = first
    .replace(/[^a-z0-9_\x2d]/g, "")
    .replace(/^[_\x2d]+/, "")
    .slice(0, 32);
  return base.length >= 3 ? base : "aluno";
}

export function GerusaStudentsPanel({
  onOpenStudent,
}: {
  onOpenStudent: (studentId: string) => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("11");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [mesaId, setMesaId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [note, setNote] = useState("");
  const [issued, setIssued] = useState<{ name: string; username: string; pin: string } | null>(
    null,
  );
  const [issuedInvite, setIssuedInvite] = useState<{
    url: string;
    mesaName: string;
    expiresAt: string;
  } | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [studentResponse, summaryResponse] = await Promise.all([
        fetch("/api/admin/students", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/master/characters", { credentials: "same-origin", cache: "no-store" }),
      ]);
      const studentData = (await studentResponse.json()) as { students?: Student[] };
      const summary = (await summaryResponse.json()) as Summary;
      if (!studentResponse.ok || !summaryResponse.ok) throw new Error("Falha ao consultar alunos.");
      setStudents(studentData.students ?? []);
      setMesas(summary.mesas ?? []);
      setCampaigns(summary.campaigns ?? []);
      if (!mesaId && summary.mesas?.[0]) setMesaId(summary.mesas[0].id);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível carregar os alunos.");
    } finally {
      setLoading(false);
    }
  }, [mesaId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const base = suggestedUsername(name);
    let candidate = base;
    let suffix = 2;
    while (candidate && students.some((student) => student.username.toLowerCase() === candidate)) {
      const suffixText = String(suffix++);
      candidate = `${base.slice(0, 32 - suffixText.length)}${suffixText}`;
    }
    setUsername(candidate);
  }, [name, students]);

  const ordered = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name)),
    [students],
  );
  async function createStudent(event: React.FormEvent) {
    event.preventDefault();
    if (!usernamePattern.test(username)) {
      setNotice(
        "Nome de acesso inválido. Use de 3 a 32 caracteres: letras minúsculas, números, hífen (-) ou sublinhado (_).",
      );
      return;
    }
    setBusy(true);
    setNotice("");
    const selectedPin = pin || makePin();
    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          age: age ? Number(age) : null,
          username,
          pin: selectedPin,
          mesaId: mesaId || null,
          campaignId: campaignId || null,
          note,
        }),
      });
      const data = (await response.json()) as { student?: Student; pin?: string; error?: string };
      if (!response.ok || !data.student || !data.pin)
        throw new Error(
          data.error === "username_unavailable" || data.error === "student_conflict"
            ? "Esse nome de acesso já está em uso. Escolha outro."
            : data.error === "invalid_username"
              ? "Nome de acesso inválido. Use de 3 a 32 caracteres: letras minúsculas, números, hífen (-) ou sublinhado (_)."
              : "Não foi possível criar o aluno.",
        );
      setIssued({ name: data.student.name, username: data.student.username, pin: data.pin });
      setName("");
      setAge("11");
      setUsername("");
      setPin("");
      setNote("");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível criar o aluno.");
    } finally {
      setBusy(false);
    }
  }
  async function act(student: Student, action: "reset_pin" | "disable" | "enable") {
    const confirmed =
      action === "reset_pin" ||
      window.confirm(
        `${action === "disable" ? "Desativar" : "Reativar"} o acesso de ${student.name}? Os dados serão preservados.`,
      );
    if (!confirmed) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/students", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          action: action === "reset_pin" ? action : undefined,
          status: action === "disable" ? "disabled" : action === "enable" ? "active" : undefined,
        }),
      });
      const data = (await response.json()) as { pin?: string };
      if (!response.ok) throw new Error("Não foi possível atualizar o acesso.");
      if (action === "reset_pin" && data.pin)
        setIssued({ name: student.name, username: student.username, pin: data.pin });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha ao atualizar o aluno.");
    } finally {
      setBusy(false);
    }
  }
  async function copyAccess() {
    if (!issued) return;
    await navigator.clipboard.writeText(
      `Gerusa\n${issued.name}\nAcesso: ${issued.username}\nPIN: ${issued.pin}\nhttps://gerusa.nomosludens.ia.br`,
    );
    setNotice("Dados de acesso copiados.");
  }
  async function createInvite() {
    if (!mesaId) {
      setNotice("Escolha uma Mesa para criar o convite.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/student-invites", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mesaId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        token?: string;
        mesaName?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!response.ok || !data.token || !data.mesaName || !data.expiresAt)
        throw new Error("Não foi possível criar o convite para esta Mesa.");
      setIssuedInvite({
        url: `${window.location.origin}/cadastro?convite=${encodeURIComponent(data.token)}`,
        mesaName: data.mesaName,
        expiresAt: data.expiresAt,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível criar o convite.");
    } finally {
      setBusy(false);
    }
  }
  async function copyInvite() {
    if (!issuedInvite) return;
    try {
      await navigator.clipboard.writeText(issuedInvite.url);
      setNotice("Convite copiado. Ele permite um cadastro e vence em 30 dias.");
    } catch {
      setNotice("Selecione e copie o link do convite.");
    }
  }

  return (
    <section
      className="space-y-5 rounded-2xl border border-[#742233]/50 bg-[#180b11] p-5 text-[#f5e9df]"
      aria-label="Alunos"
    >
      <header>
        <p className="text-xs uppercase tracking-[.18em] text-[#d5a56c]">Sua turma</p>
        <h1 className="serif text-3xl">Alunos</h1>
        <p className="mt-1 text-sm text-[#e7c9b7]/70">
          Crie o acesso e acompanhe cada estudante pela Gerusa.
        </p>
      </header>
      {issued ? (
        <article
          className="rounded-xl border border-[#bb5263]/70 bg-[#310d1a] p-5"
          aria-live="polite"
        >
          <h2 className="serif text-2xl">Acesso de {issued.name}</h2>
          <p className="mt-3">
            Nome de acesso: <strong>{issued.username}</strong>
          </p>
          <p>
            PIN: <strong className="font-mono text-lg tracking-widest">{issued.pin}</strong>
          </p>
          <p className="mt-2 text-sm text-[#f0c7b6]">
            Este PIN só aparece agora. Entregue ao aluno com o endereço gerusa.nomosludens.ia.br.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="min-h-11 rounded-lg bg-[#9f3049] px-4"
              onClick={() => void copyAccess()}
            >
              Copiar
            </button>
            <button
              className="min-h-11 rounded-lg border border-[#8a3045] px-4"
              onClick={() => window.print()}
            >
              Imprimir
            </button>
            <button
              className="min-h-11 rounded-lg border border-[#8a3045] px-4"
              onClick={() => setIssued(null)}
            >
              Concluir
            </button>
          </div>
        </article>
      ) : null}
      {issuedInvite ? (
        <article
          className="rounded-xl border border-[#bb5263]/70 bg-[#310d1a] p-5"
          aria-live="polite"
        >
          <h2 className="serif text-2xl">Convite para {issuedInvite.mesaName}</h2>
          <p className="mt-3 break-all rounded-lg border border-[#8a3045] bg-[#10070b] p-3 text-sm">
            {issuedInvite.url}
          </p>
          <p className="mt-2 text-sm text-[#f0c7b6]">
            Link de uso único, válido até {new Date(issuedInvite.expiresAt).toLocaleString("pt-BR")}
            . O aluno cria seu próprio nome de acesso e PIN.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-lg bg-[#9f3049] px-4"
              onClick={() => void copyInvite()}
            >
              Copiar convite
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg border border-[#8a3045] px-4"
              onClick={() => setIssuedInvite(null)}
            >
              Concluir
            </button>
          </div>
        </article>
      ) : null}
      <article className="grid gap-3 rounded-xl border border-[#742233]/40 bg-[#220d15] p-4">
        <h2 className="serif text-xl">Convidar estudante para uma Mesa</h2>
        <p className="text-sm text-[#e7c9b7]/70">
          Crie um link de uso único. O estudante escolhe seu próprio acesso ao concluir o cadastro.
        </p>
        <button
          type="button"
          disabled={busy || loading || !mesaId}
          onClick={() => void createInvite()}
          className="min-h-11 rounded-lg border border-[#8a3045] px-4 disabled:opacity-60"
        >
          Gerar convite para {mesas.find((mesa) => mesa.id === mesaId)?.name ?? "Mesa"}
        </button>
      </article>
      <form
        onSubmit={createStudent}
        className="grid gap-3 rounded-xl border border-[#742233]/40 bg-[#220d15] p-4 sm:grid-cols-2"
      >
        <h2 className="serif text-xl sm:col-span-2">+ Novo aluno</h2>
        <label className="grid gap-1 text-sm">
          Nome
          <Input
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Idade
          <Input
            type="number"
            min={5}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Nome de acesso
          <Input
            required
            minLength={3}
            maxLength={32}
            pattern={usernameHtmlPattern}
            title="Use de 3 a 32 caracteres: letras minúsculas, números, hífen (-) ou sublinhado (_)."
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
          />
        </label>
        <label className="grid gap-1 text-sm">
          PIN de 6 dígitos
          <Input
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="Gerar automaticamente"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Mesa inicial
          <select
            value={mesaId}
            onChange={(e) => {
              setMesaId(e.target.value);
              setCampaignId("");
            }}
            className="min-h-11 rounded-md border border-[#743044] bg-[#10070b] px-3"
          >
            {mesas.map((mesa) => (
              <option key={mesa.id} value={mesa.id}>
                {mesa.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Campanha inicial (opcional)
          <select
            value={campaignId}
            onChange={(event) => {
              const chosen = campaigns.find((campaign) => campaign.id === event.target.value);
              setCampaignId(event.target.value);
              if (chosen) setMesaId(chosen.mesaId);
            }}
            className="min-h-11 rounded-md border border-[#743044] bg-[#10070b] px-3"
          >
            <option value="">Sem campanha</option>
            {campaigns
              .filter((campaign) => campaign.mesaId === mesaId)
              .map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          Observação privada da professora
          <textarea
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-20 rounded-md border border-[#743044] bg-[#10070b] p-3"
          />
        </label>
        <button
          disabled={busy || loading}
          className="min-h-11 rounded-lg bg-[#9f3049] px-4 font-medium disabled:opacity-60 sm:col-span-2"
        >
          {busy ? "Salvando…" : "Criar aluno e mostrar acesso"}
        </button>
      </form>
      {notice ? (
        <p role="status" className="rounded border border-[#bb5263]/60 p-3 text-sm">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <p>Carregando alunos…</p>
      ) : ordered.length ? (
        <ul className="divide-y divide-[#742233]/35 rounded-xl border border-[#742233]/40">
          {ordered.map((student) => (
            <li key={student.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {student.name}
                  {student.age ? ` · ${student.age} anos` : ""}
                </p>
                <p className="text-sm text-[#e7c9b7]/70">
                  {student.username} · {student.mesaName}
                  {student.campaignName ? ` · ${student.campaignName}` : ""} ·{" "}
                  {student.status === "active" ? "Ativo" : "Desativado"}
                </p>
                <p className="text-xs text-[#e7c9b7]/50">
                  Último acesso:{" "}
                  {student.lastAccess
                    ? new Date(student.lastAccess).toLocaleString("pt-BR")
                    : "Ainda não entrou"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  onClick={() => onOpenStudent(student.id)}
                  className="min-h-10 rounded border border-[#8a3045] px-3 text-sm"
                >
                  Abrir
                </button>
                <button
                  disabled={busy}
                  onClick={() => void act(student, "reset_pin")}
                  className="min-h-10 rounded border border-[#8a3045] px-3 text-sm"
                >
                  Redefinir PIN
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void act(student, student.status === "active" ? "disable" : "enable")
                  }
                  className="min-h-10 rounded border border-[#8a3045] px-3 text-sm"
                >
                  {student.status === "active" ? "Desativar" : "Reativar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#e7c9b7]/70">
          Ainda não há alunos. Crie o primeiro para começar.
        </p>
      )}
    </section>
  );
}
