import { useProfile } from "@/lib/use-profile";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function GerusaAccountPanel() {
  const { profile, reload } = useProfile();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setName(profile?.display_name ?? "");
  }, [profile?.display_name]);
  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ display_name: name }),
      });
      if (!response.ok) throw new Error();
      await reload();
      toast.success("Nome atualizado.");
    } catch {
      toast.error("Não foi possível atualizar o nome.");
    } finally {
      setSaving(false);
    }
  }
  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 12) {
      toast.error("Use uma senha com pelo menos 12 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) throw new Error();
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Senha alterada. As outras sessões foram encerradas.");
    } catch {
      toast.error("Não foi possível alterar a senha. Confira a senha atual.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="grid gap-5 rounded-2xl border border-[#742233]/50 bg-[#180b11] p-5 text-[#f5e9df] sm:grid-cols-2"
      aria-label="Minha conta"
    >
      <form
        onSubmit={saveName}
        className="grid content-start gap-3 rounded-xl border border-[#742233]/40 bg-[#220d15] p-4"
      >
        <h2 className="serif text-2xl">Minha conta</h2>
        <p className="text-sm text-[#e7c9b7]/70">Atualize como seu nome aparece para a turma.</p>
        <label className="grid gap-1 text-sm">
          Nome
          <Input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button disabled={saving} className="min-h-11 rounded-lg bg-[#9f3049] px-4">
          Salvar nome
        </button>
      </form>
      <form
        onSubmit={changePassword}
        className="grid content-start gap-3 rounded-xl border border-[#742233]/40 bg-[#220d15] p-4"
      >
        <h2 className="serif text-2xl">Alterar senha</h2>
        <label className="grid gap-1 text-sm">
          Senha atual
          <Input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Nova senha (mínimo 12 caracteres)
          <Input
            required
            minLength={12}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <button disabled={saving} className="min-h-11 rounded-lg border border-[#a54658] px-4">
          Atualizar senha
        </button>
      </form>
    </section>
  );
}
