import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PRESENCA_META, usePresencaRegime, type PresencaState } from "@/lib/use-presenca-regime";

const ORDER: PresencaState[] = ["green", "yellow", "blue", "red"];
type Mesa = { id: string; name: string };
type ControlledPresence = {
  state: PresencaState | null;
  setState: (state: PresencaState) => Promise<boolean> | boolean;
  nota: string;
  setNota: (value: string) => void;
  mesas: Mesa[];
  mesaId: string | null;
  setMesa: (value: string) => void;
  saving?: boolean;
  error?: string | null;
};

export function SemaforoPresence({
  compact = false,
  defaultOpen = false,
  forceState,
  controlled,
}: {
  compact?: boolean;
  defaultOpen?: boolean;
  forceState?: PresencaState;
  controlled?: ControlledPresence;
}) {
  const fallback = usePresencaRegime();
  const source = controlled ?? fallback;
  const { state, setState, nota, setNota, mesas, mesaId, setMesa, saving, error } = source;
  const [open, setOpen] = useState(defaultOpen);
  const current = forceState ?? state ?? "green";
  const meta = PRESENCA_META[current];
  const noMesa = mesas.length === 0;
  const mesaNeedsChoice = mesas.length > 1 && !mesaId;
  return (
    <div className="rounded-xl border border-white/5 bg-[#0C0B12]/80 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="min-h-11 w-full flex items-center gap-2 px-3 py-2"
        aria-expanded={open}
      >
        <span
          className={`w-2 h-2 rounded-full ${meta.dot} ring-2 ${meta.ring} ${meta.glow}`}
          aria-hidden
        />
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/55">Semáforo</span>
        <span className="text-[11px] text-[#F3EBDD]/80">
          {noMesa ? "Sem Mesa" : mesaNeedsChoice ? "Escolha uma Mesa" : meta.short}
        </span>
        {mesaId ? (
          <span className="max-w-[35%] truncate text-[10px] text-[#F3EBDD]/40">
            · {mesas.find((mesa) => mesa.id === mesaId)?.name}
          </span>
        ) : null}
        {nota.trim() ? (
          <span className="text-[10px] italic text-[#F3EBDD]/40 truncate max-w-[40%]">
            · {nota}
          </span>
        ) : null}
        <span className="ml-auto text-[#F3EBDD]/40">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open ? (
        <div className="px-3 pb-3 pt-1 space-y-2">
          {noMesa ? (
            <p className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#F3EBDD]/55">
              Você não possui mesa ativa.
            </p>
          ) : null}
          {mesas.length > 1 ? (
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#F3EBDD]/45">
              Mesa
              <select
                value={mesaId ?? ""}
                onChange={(event) => setMesa(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-[#F3EBDD]"
                aria-label="Mesa do semáforo"
              >
                <option value="">Escolha uma mesa</option>
                {mesas.map((mesa) => (
                  <option key={mesa.id} value={mesa.id}>
                    {mesa.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {mesaNeedsChoice ? (
            <p className="text-xs text-[#F3EBDD]/50">
              Escolha uma Mesa para declarar sua presença.
            </p>
          ) : null}
          {!noMesa && !mesaNeedsChoice ? (
            <div className="flex flex-wrap gap-2">
              {ORDER.map((regime) => {
                const item = PRESENCA_META[regime];
                const active = regime === current;
                return (
                  <button
                    key={regime}
                    type="button"
                    onClick={() => void setState(regime)}
                    className={
                      "inline-flex min-h-11 min-w-[44px] items-center justify-center gap-1.5 px-3 rounded-full border text-[11px] transition " +
                      (active
                        ? item.chip
                        : "border-white/10 text-[#F3EBDD]/55 hover:text-[#F3EBDD] hover:border-white/25")
                    }
                    aria-pressed={active}
                    title={item.label}
                    disabled={saving}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${item.dot} ${item.glow}`}
                      aria-hidden
                    />
                    {item.short}
                  </button>
                );
              })}
            </div>
          ) : null}
          {saving ? <p className="text-[11px] text-[#F3EBDD]/50">Salvando presença…</p> : null}
          {error ? (
            <p role="alert" className="text-[11px] text-rose-200">
              Não foi possível atualizar agora; o estado foi reconciliado com o servidor.
            </p>
          ) : null}
          {!compact && !noMesa ? (
            <>
              <input
                type="text"
                value={nota}
                onChange={(event) => setNota(event.target.value.slice(0, 280))}
                placeholder="Algo que a Kallistis deve respeitar neste regime, sem virar memória."
                className="min-h-11 w-full bg-transparent border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] text-[#F3EBDD]/85 placeholder:text-[#F3EBDD]/30 outline-none focus:border-[color:var(--gold)]/60"
                maxLength={280}
              />
              <p className="text-[10px] italic text-[#F3EBDD]/35">
                Regime de presença declarado. Não é diagnóstico. Nota fica só neste dispositivo.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
