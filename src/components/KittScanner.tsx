import { useEffect, useRef } from "react";

export type KittState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "radar"
  | "speaking"
  | "unavailable";

export type KittVariant = "ruby" | "ember" | "auto";

interface KittScannerProps {
  state?: KittState;
  variant?: KittVariant;
  /** Número de barras verticais. KITT clássico = 8. */
  segments?: number;
  /** Altura total do housing em px. */
  height?: number;
  className?: string;
  ariaLabel?: string;
}

// Paleta da identidade KALLISTIS: violeta saturado, com halo profundo.
// Variantes mantidas por compatibilidade — todas convergem ao roxo KALLISTIS.
const PALETTES: Record<
  KittVariant,
  { core: [number, number, number]; halo: [number, number, number] }
> = {
  ruby: { core: [140, 95, 255], halo: [95, 53, 158] },
  ember: { core: [140, 95, 255], halo: [95, 53, 158] },
  auto: { core: [140, 95, 255], halo: [95, 53, 158] },
};

// Velocidade e comportamento por estado.
// - sweep:   varredura clássica vai-e-vem
// - breathe: estática no centro, pulsando
// - strobe:  flicker rápido + sweep curto (radar)
function stateProfile(state: KittState) {
  switch (state) {
    case "listening":
      return { mode: "sweep" as const, speed: 1.6, trail: 2.2, dim: 1.0, jitter: 0.0 };
    case "transcribing":
      return { mode: "sweep" as const, speed: 2.6, trail: 1.6, dim: 1.0, jitter: 0.15 };
    case "thinking":
      return { mode: "breathe" as const, speed: 0.0, trail: 2.5, dim: 0.9, jitter: 0.0 };
    case "radar":
      return { mode: "strobe" as const, speed: 3.4, trail: 1.2, dim: 1.0, jitter: 0.35 };
    case "speaking":
      return { mode: "sweep" as const, speed: 2.0, trail: 2.0, dim: 1.0, jitter: 0.05 };
    case "unavailable":
      return { mode: "breathe" as const, speed: 0.0, trail: 3.0, dim: 0.3, jitter: 0.0 };
    case "idle":
    default:
      return { mode: "breathe" as const, speed: 0.0, trail: 2.8, dim: 0.7, jitter: 0.0 };
  }
}

export function KittScanner({
  state = "idle",
  variant = "ruby",
  segments = 8,
  height = 28,
  className,
  ariaLabel,
}: KittScannerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = PALETTES[variant];
    const profile = stateProfile(state);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Housing preto fosco com gradiente vertical sutil (interior do painel).
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#050505");
      bg.addColorStop(0.5, "#08060c");
      bg.addColorStop(1, "#040306");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Borda interna fina (chanfro do painel).
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

      const t = (now - startRef.current) / 1000;

      // Posição do "olho" 0..1 — sweep clássico em onda triangular.
      let pos: number;
      if (profile.mode === "breathe") {
        pos = 0.5;
      } else {
        const phase = (t * profile.speed) % 2;
        pos = phase < 1 ? phase : 2 - phase;
      }

      // Pulsação para breathe; flicker para strobe.
      const breath = profile.mode === "breathe" ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.8)) : 1;
      const strobe = profile.mode === "strobe" ? 0.7 + 0.3 * (Math.sin(t * 28) > 0 ? 1 : 0.4) : 1;

      // Geometria das barras: padding lateral, gap, altura interna.
      const padX = Math.max(4, w * 0.015);
      const padY = Math.max(3, h * 0.18);
      const gap = Math.max(2, w * 0.008);
      const usableW = w - padX * 2 - gap * (segments - 1);
      const segW = usableW / segments;
      const segH = h - padY * 2;

      const [cr, cg, cb] = palette.core;
      const [hr, hg, hb] = palette.halo;

      // Renderiza cada barra com falloff exponencial em torno do "olho".
      // trail controla a largura do rastro (maior = rastro mais longo).
      const sigma = 1 / Math.max(1.0, profile.trail * 1.4);

      for (let i = 0; i < segments; i++) {
        const segCenter = (i + 0.5) / segments;
        const d = Math.abs(segCenter - pos);
        // Falloff exponencial — rastro nítido tipo KITT, sem gaussiana mole.
        let intensity = Math.exp(-d / sigma);

        if (profile.jitter > 0) {
          // Pequeno ruído estável por barra/frame (cintilação).
          const n = Math.sin(t * 30 + i * 1.7) * 0.5 + 0.5;
          intensity *= 1 - profile.jitter * (1 - n) * 0.6;
        }

        const alpha = Math.min(1, intensity) * profile.dim * breath * strobe;
        const x = padX + i * (segW + gap);

        // Halo difuso atrás da barra.
        const haloAlpha = alpha * 0.55;
        if (haloAlpha > 0.01) {
          const grad = ctx.createRadialGradient(
            x + segW / 2,
            h / 2,
            1,
            x + segW / 2,
            h / 2,
            Math.max(segW, segH) * 0.9,
          );
          grad.addColorStop(0, `rgba(${hr},${hg},${hb},${haloAlpha})`);
          grad.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(x - segW * 0.6, 0, segW * 2.2, h);
        }

        // Núcleo da barra (roxo KALLISTIS).
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.pow(alpha, 1.2)})`;
        // cantos sutis para parecer uma barra de LED.
        roundedRect(ctx, x, padY, segW, segH, Math.min(2, segW * 0.18));
        ctx.fill();

        // Highlight central (linha mais quente — quase branca no pico).
        const hot = Math.pow(alpha, 2.2);
        if (hot > 0.05) {
          ctx.fillStyle = `rgba(255,${180 + 60 * hot},${160 + 60 * hot},${hot * 0.9})`;
          const innerH = segH * 0.55;
          ctx.fillRect(x + segW * 0.15, (h - innerH) / 2, segW * 0.7, innerH);
        }

        // Linha divisória escura entre LEDs (sensação de painel físico).
        if (i < segments - 1) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(x + segW, padY, gap, segH);
        }
      }
    };

    const loop = (now: number) => {
      draw(now);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [state, variant, segments]);

  return (
    <div
      className={className}
      role="status"
      aria-label={ariaLabel ?? `KITT: ${state}`}
      style={{
        width: "100%",
        height,
        // Housing externo: preto puro com borda dupla, sombra de profundidade.
        background: "#000",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 4,
        boxShadow:
          "inset 0 0 0 1px rgba(0,0,0,0.9), inset 0 1px 2px rgba(255,255,255,0.04), 0 0 18px rgba(140,95,255,0.18)",
        padding: 2,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", borderRadius: 2 }}
      />
    </div>
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export default KittScanner;
