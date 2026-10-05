// Kallistis Presente — interface voice-first para o admin.
// Conecta à Kallistis (facet="kallistis") com avatar e cores da Kallistis.
// Reutiliza VoiceFirstChatView com tema laranja.

import { kallistisAvatar } from "@/lib/brand-assets";
import { VoiceFirstChatView } from "@/components/VoiceFirstChatView";

export type KallistisPresenteViewProps = {
  threadId: string;
};

const KALLISTIS_THEME = {
  accent: "var(--gold)",
  accentSoft: "color-mix(in oklab, var(--gold) 16%, transparent)",
  background: "#08080E",
};

export function KallistisPresenteView({ threadId }: KallistisPresenteViewProps) {
  if (!threadId) {
    return (
      <div
        className="flex h-full min-h-[calc(100dvh-3.5rem)] items-center justify-center"
        style={{ background: "#08080E", color: "#F3EBDD" }}
      >
        <p className="text-sm opacity-60">Iniciando Kallistis Presente...</p>
      </div>
    );
  }

  return (
    <VoiceFirstChatView
      mode="kallistis-presente"
      facet="kallistis"
      threadId={threadId}
      avatarUrl={kallistisAvatar.url}
      label="Kallistis"
      theme={KALLISTIS_THEME}
      autoSpeak={true}
    />
  );
}
