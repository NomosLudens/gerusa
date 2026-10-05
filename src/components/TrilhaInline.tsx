// Trilha inline: aparece sob cada resposta da Kallistis.
// Mostra: mensagens-fonte que entraram no contexto + hipóteses sedimentadas
// que essas fontes geraram (se já houver).

import { useState } from "react";
import { ChevronDown, GitBranch, Sparkles } from "lucide-react";
import type { ChatMessageRow, SedimentoRow } from "@/lib/trilha";
import { NIVEL_LABEL, STATUS_LABEL } from "@/lib/trilha";

export function TrilhaInline({
  assistantId,
  messages,
  sedimentos,
}: {
  assistantId: string;
  messages: ChatMessageRow[];
  sedimentos: SedimentoRow[];
}) {
  const [open, setOpen] = useState(false);
  const target = messages.find((m) => m.id === assistantId);
  const sourceIds = new Set(target?.derived_from ?? []);
  const sources = messages.filter((m) => sourceIds.has(m.id));
  const sedRelated = sedimentos.filter(
    (s) => s.source_kind === "chat_message" && s.source_ids.some((id) => sourceIds.has(id)),
  );

  if (sources.length === 0 && sedRelated.length === 0) return null;

  return (
    <div className="mt-1 ml-11">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-[color:var(--ivory-dim)] hover:text-[color:var(--gold)] transition-colors"
      >
        <GitBranch className="w-3 h-3" />
        <span>trilha</span>
        {sedRelated.length > 0 && (
          <span className="text-[color:var(--gold)]">
            · {sedRelated.length} hipótese{sedRelated.length > 1 ? "s" : ""}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg border border-[color:var(--border)] bg-card/40 p-3 text-xs">
          {sedRelated.length > 0 && (
            <section>
              <h4 className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--gold)] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                comprimido em memória útil
              </h4>
              <ul className="space-y-2">
                {sedRelated.map((s) => (
                  <li
                    key={s.id}
                    className="rounded border border-[color:var(--border)] p-2 bg-background/40"
                  >
                    <div className="flex items-center gap-2 text-[9px] tracking-[0.18em] uppercase text-[color:var(--ivory-dim)] mb-1">
                      <span>{NIVEL_LABEL[s.nivel] ?? s.nivel}</span>
                      <span>·</span>
                      <span>{STATUS_LABEL[s.status] ?? s.status}</span>
                      <span>·</span>
                      <span>confiança {s.confianca}/3</span>
                    </div>
                    <p className="text-[color:var(--ivory)] leading-snug">{s.hipotese}</p>
                    {s.resumo && (
                      <p className="text-[color:var(--ivory-dim)] mt-1 leading-snug">{s.resumo}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sources.length > 0 && (
            <section>
              <h4 className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--ivory-dim)] mb-2">
                deriva de {sources.length} mensagem{sources.length > 1 ? "s" : ""}
              </h4>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {sources.slice(-6).map((m) => (
                  <li key={m.id} className="text-[color:var(--ivory-dim)] truncate">
                    <span className="text-[color:var(--gold)]/70">
                      [{m.role === "user" ? "você" : "kallistis"}]
                    </span>{" "}
                    {m.content.slice(0, 120)}
                    {m.content.length > 120 && "…"}
                  </li>
                ))}
                {sources.length > 6 && (
                  <li className="text-[color:var(--ivory-dim)]/60 italic">
                    + {sources.length - 6} anteriores
                  </li>
                )}
              </ul>
            </section>
          )}

          <p className="text-[9px] text-[color:var(--ivory-dim)]/60 italic leading-snug pt-1 border-t border-[color:var(--border)]">
            hipóteses são candidatas — não são memória confirmada até passar pela revisão.
          </p>
        </div>
      )}
    </div>
  );
}
