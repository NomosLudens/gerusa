// useWakeLock — mantém a tela ligada enquanto `active` for true.
// Reativa automaticamente se a aba volta a ficar visível (o navegador derruba o wake lock ao esconder).
import { useEffect, useRef } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> } | null;

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const wl = (
      navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;
    if (!wl) return;

    let cancelled = false;

    async function acquire() {
      try {
        const s = await wl!.request("screen");
        if (cancelled) {
          await s?.release().catch(() => {});
          return;
        }
        sentinelRef.current = s;
      } catch {
        // permissão negada ou bateria fraca — segue sem
      }
    }

    async function release() {
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) await s.release().catch(() => {});
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && active && !sentinelRef.current) {
        void acquire();
      }
    }

    if (active) {
      void acquire();
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, [active]);
}
