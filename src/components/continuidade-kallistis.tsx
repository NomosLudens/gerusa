import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkle, Trash2, Power, PowerOff } from "lucide-react";
import {
  listarContextos,
  listarContextoOpcoes,
  criarContexto,
  toggleContexto,
  apagarContexto,
} from "@/lib/contexto-externo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ContextoScope = "global" | "mesa" | "campaign";

// Migração de identidade: o usuário cola o markdown de uma Kallistis anterior e o que
// estiver ativo passa a compor a identidade/continuidade da própria Kallistis nas conversas.
export function ContinuidadeKallistis() {
  const router = useRouter();
  const listar = useServerFn(listarContextos);
  const listarOpcoes = useServerFn(listarContextoOpcoes);
  const criar = useServerFn(criarContexto);
  const toggle = useServerFn(toggleContexto);
  const apagar = useServerFn(apagarContexto);

  const {
    data: rows = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["contexto-externo"],
    queryFn: () => listar(),
  });
  const { data: options = { mesas: [], campaigns: [] } } = useQuery({
    queryKey: ["contexto-externo-opcoes"],
    queryFn: () => listarOpcoes(),
  });

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [scope, setScope] = useState<ContextoScope>("global");
  const [mesaId, setMesaId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!titulo.trim() || !conteudo.trim()) {
      toast.error("Dá um título e cola o markdown.");
      return;
    }
    if (scope === "mesa" && !mesaId) {
      toast.error("Escolha a Mesa do contexto.");
      return;
    }
    if (scope === "campaign" && !campaignId) {
      toast.error("Escolha a campanha do contexto.");
      return;
    }
    setSaving(true);
    try {
      await criar({
        data: {
          titulo: titulo.trim(),
          conteudo: conteudo.trim(),
          scope,
          mesaId: scope === "mesa" ? mesaId : null,
          campaignId: scope === "campaign" ? campaignId : null,
        },
      });
      setTitulo("");
      setConteudo("");
      toast.success("Contexto salvo. Kallistis já o carrega quando o escopo for aplicável.");
      await refetch();
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou ao migrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <Sparkle className="h-5 w-5 text-[color:var(--ivory)]" />
        <div>
          <h2 className="serif text-lg text-[color:var(--ivory)]">Continuidade da Kallistis</h2>
          <p className="text-sm text-[color:var(--ivory-dim)]">
            Contextos ativos entram no Hermes somente quando o escopo da conversa for aplicável.
            Global, Mesa e campanha permanecem separados.
          </p>
        </div>
      </header>

      <section className="mb-8 rounded-lg border border-[color:var(--sidebar-border)] bg-[color:var(--card)] p-4">
        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[color:var(--ivory-dim)]">
          Título
        </label>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="ex.: Kallistis anterior — síntese 24/06"
          maxLength={120}
          className="mb-3"
        />
        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[color:var(--ivory-dim)]">
          Conteúdo
        </label>
        <Textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Cole aqui o markdown completo da identidade / continuidade da Kallistis anterior…"
          rows={12}
          className="font-mono text-sm"
          maxLength={60_000}
        />
        <label
          htmlFor="contexto-escopo"
          className="mb-2 block text-xs uppercase tracking-[0.2em] text-[color:var(--ivory-dim)]"
        >
          Escopo
        </label>
        <select
          id="contexto-escopo"
          value={scope}
          onChange={(e) => setScope(e.target.value as ContextoScope)}
          className="mb-3 h-10 w-full rounded-md border border-[color:var(--border)] bg-card px-3 text-sm text-[color:var(--ivory)] outline-none focus:border-[color:var(--gold)]"
        >
          <option value="global">Global do usuário</option>
          <option value="mesa">Mesa</option>
          <option value="campaign">Campanha</option>
        </select>
        {scope === "mesa" ? (
          <select
            aria-label="Mesa do contexto"
            value={mesaId}
            onChange={(e) => setMesaId(e.target.value)}
            className="mb-3 h-10 w-full rounded-md border border-[color:var(--border)] bg-card px-3 text-sm text-[color:var(--ivory)] outline-none focus:border-[color:var(--gold)]"
          >
            <option value="">Escolha a Mesa</option>
            {options.mesas.map((mesa) => (
              <option key={mesa.id} value={mesa.id}>
                {mesa.name}
              </option>
            ))}
          </select>
        ) : null}
        {scope === "campaign" ? (
          <select
            aria-label="Campanha do contexto"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="mb-3 h-10 w-full rounded-md border border-[color:var(--border)] bg-card px-3 text-sm text-[color:var(--ivory)] outline-none focus:border-[color:var(--gold)]"
          >
            <option value="">Escolha a campanha</option>
            {options.campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} — {campaign.mesaName}
              </option>
            ))}
          </select>
        ) : null}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[color:var(--ivory-dim)]">
            {conteudo.length.toLocaleString("pt-BR")} / 60.000
          </span>
          <Button onClick={salvar} disabled={saving}>
            {saving ? "Salvando…" : "Salvar contexto"}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm uppercase tracking-[0.2em] text-[color:var(--ivory-dim)]">
          Continuidades guardadas
        </h3>
        {isLoading ? (
          <p className="text-sm text-[color:var(--ivory-dim)]">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[color:var(--ivory-dim)]">
            Nada ainda. Cole a primeira acima.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-[color:var(--sidebar-border)] bg-[color:var(--card)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate font-medium text-[color:var(--ivory)]">{r.titulo}</h4>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider " +
                          (r.ativo
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-zinc-500/15 text-zinc-400")
                        }
                      >
                        {r.ativo ? "ativo" : "pausado"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
                      {r.campaign_id
                        ? `Campanha: ${r.campaign_name ?? "selecionada"}`
                        : r.mesa_id
                          ? `Mesa: ${r.mesa_name ?? "selecionada"}`
                          : "Global do usuário"}{" "}
                      · {new Date(r.updated_at).toLocaleString("pt-BR")} ·{" "}
                      {r.conteudo.length.toLocaleString("pt-BR")} chars
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={r.ativo ? "Pausar" : "Reativar"}
                      onClick={async () => {
                        await toggle({ data: { id: r.id, ativo: !r.ativo } });
                        await refetch();
                      }}
                    >
                      {r.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Apagar"
                      onClick={async () => {
                        if (!confirm("Apagar esta continuidade?")) return;
                        await apagar({ data: { id: r.id } });
                        await refetch();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-[color:var(--ivory-dim)]">
                    Ver conteúdo
                  </summary>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-3 text-xs text-[color:var(--ivory)]">
                    {r.conteudo}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
