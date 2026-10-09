import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type Mesa = { id: string; name: string };
type Teacher = {
  id: string;
  name: string;
  email: string;
  mesas: Mesa[];
};
type IssuedAccess = { name: string; email: string; temporaryPassword: string };

export function GerusaTeachersPanel() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [selectedMesaIds, setSelectedMesaIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState<IssuedAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [teacherResponse, mesaResponse] = await Promise.all([
        fetch("/api/admin/teachers", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/master/characters", { credentials: "same-origin", cache: "no-store" }),
      ]);
      const teacherData = (await teacherResponse.json().catch(() => ({}))) as {
        teachers?: Teacher[];
        error?: string;
      };
      const mesaData = (await mesaResponse.json().catch(() => ({}))) as {
        mesas?: Mesa[];
      };
      if (!teacherResponse.ok || !mesaResponse.ok)
        throw new Error(
          teacherData.error === "forbidden"
            ? "Somente a administração principal pode gerenciar a equipe."
            : "Não foi possível carregar a equipe.",
        );
      setTeachers(teacherData.teachers ?? []);
      setMesas(mesaData.mesas ?? []);
      setSelectedMesaIds((current) =>
        current.length ? current : mesaData.mesas?.[0] ? [mesaData.mesas[0].id] : [],
      );
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível carregar a equipe.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createTeacher(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/teachers", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, mesaIds: selectedMesaIds }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        teacher?: Teacher;
        temporaryPassword?: string;
        error?: string;
      };
      if (!response.ok || !result.teacher || !result.temporaryPassword)
        throw new Error(
          result.error === "teacher_conflict"
            ? "Esse e-mail já está em uso ou uma Mesa selecionada deixou de estar disponível. Confira e tente novamente."
            : "Não foi possível criar a conta da professora.",
        );
      setIssued({
        name: result.teacher.name,
        email: result.teacher.email,
        temporaryPassword: result.temporaryPassword,
      });
      setName("");
      setEmail("");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(teacher: Teacher) {
    if (
      !window.confirm(
        `Gerar uma nova senha temporária para ${teacher.name}? As sessões atuais serão encerradas.`,
      )
    )
      return;
    setResettingId(teacher.id);
    setNotice("");
    try {
      const response = await fetch("/api/admin/teachers", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: teacher.id, action: "reset_password" }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        temporaryPassword?: string;
      };
      if (!response.ok || !result.temporaryPassword)
        throw new Error("Não foi possível gerar uma nova senha temporária.");
      setIssued({
        name: teacher.name,
        email: teacher.email,
        temporaryPassword: result.temporaryPassword,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    } finally {
      setResettingId(null);
    }
  }

  async function copyAccess(access: IssuedAccess) {
    try {
      await navigator.clipboard.writeText(
        `Gerusa\n${access.name}\nE-mail: ${access.email}\nSenha temporária: ${access.temporaryPassword}\nhttps://gerusa.nomosludens.ia.br/auth`,
      );
      setNotice("Acesso copiado. Compartilhe a senha por um canal seguro.");
    } catch {
      setNotice("Não foi possível copiar. Selecione e copie os dados exibidos.");
    }
  }

  return (
    <section
      className="space-y-5 rounded-2xl border border-[#742233]/50 bg-[#180b11] p-5 text-[#f5e9df]"
      aria-label="Equipe de professoras"
    >
      <header>
        <p className="text-xs uppercase tracking-[.18em] text-[#d5a56c]">Administração</p>
        <h1 className="serif text-3xl">Equipe de professoras</h1>
        <p className="mt-1 text-sm text-[#e7c9b7]/70">
          Crie contas individuais e escolha as Mesas que cada professora poderá acompanhar.
        </p>
      </header>

      {issued ? (
        <article
          className="rounded-xl border border-[#bb5263]/70 bg-[#310d1a] p-5"
          aria-live="polite"
        >
          <h2 className="serif text-2xl">Acesso de {issued.name}</h2>
          <p className="mt-3">
            E-mail: <strong>{issued.email}</strong>
          </p>
          <p>
            Senha temporária:{" "}
            <strong className="break-all font-mono">{issued.temporaryPassword}</strong>
          </p>
          <p className="mt-2 text-sm text-[#f0c7b6]">
            A senha aparece somente nesta tela. Entregue-a à professora por um canal seguro; depois
            do primeiro acesso, ela pode alterá-la em “Minha conta”.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-lg bg-[#9f3049] px-4"
              onClick={() => void copyAccess(issued)}
            >
              Copiar acesso
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg border border-[#8a3045] px-4"
              onClick={() => setIssued(null)}
            >
              Concluir
            </button>
          </div>
        </article>
      ) : null}

      <form
        onSubmit={createTeacher}
        className="grid gap-3 rounded-xl border border-[#742233]/40 bg-[#220d15] p-4"
      >
        <h2 className="serif text-xl">+ Nova professora</h2>
        <label className="grid gap-1 text-sm">
          Nome
          <Input
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          E-mail de acesso
          <Input
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value.trimStart())}
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm">Mesas da professora</legend>
          {mesas.length ? (
            mesas.map((mesa) => (
              <label key={mesa.id} className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedMesaIds.includes(mesa.id)}
                  onChange={(event) =>
                    setSelectedMesaIds((current) =>
                      event.target.checked
                        ? [...current, mesa.id]
                        : current.filter((id) => id !== mesa.id),
                    )
                  }
                />
                {mesa.name}
              </label>
            ))
          ) : (
            <p className="text-sm text-[#e7c9b7]/70">Nenhuma Mesa disponível para vincular.</p>
          )}
        </fieldset>
        <button
          disabled={busy || loading || !mesas.length || !selectedMesaIds.length}
          className="min-h-11 rounded-lg bg-[#9f3049] px-4 disabled:opacity-50"
        >
          {busy ? "Criando conta…" : "Criar conta da professora"}
        </button>
      </form>

      {notice ? (
        <p role="status" className="rounded-lg border border-[#8a3045]/70 p-3 text-sm">
          {notice}
        </p>
      ) : null}
      <section aria-label="Professoras cadastradas">
        <h2 className="serif text-xl">Professoras cadastradas</h2>
        {loading ? <p className="mt-2 text-sm text-[#e7c9b7]/70">Carregando equipe…</p> : null}
        {!loading && !teachers.length ? (
          <p className="mt-2 text-sm text-[#e7c9b7]/70">Nenhuma outra professora cadastrada.</p>
        ) : null}
        {teachers.length ? (
          <ul className="mt-2 divide-y divide-[#742233]/35 rounded-xl border border-[#742233]/40">
            {teachers.map((teacher) => (
              <li
                key={teacher.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p>{teacher.name}</p>
                  <p className="text-sm text-[#e7c9b7]/70">{teacher.email}</p>
                  <p className="text-xs text-[#e7c9b7]/60">
                    Mesas: {teacher.mesas.map((mesa) => mesa.name).join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={resettingId === teacher.id}
                  className="min-h-10 rounded-lg border border-[#8a3045] px-3 text-sm disabled:opacity-50"
                  onClick={() => void resetPassword(teacher)}
                >
                  {resettingId === teacher.id ? "Gerando…" : "Gerar nova senha"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );
}
