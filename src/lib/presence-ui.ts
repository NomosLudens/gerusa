export type PresenceMesa = { id: string; name: string };

export function resolveMesaSelection(mesas: PresenceMesa[], current: string | null): string | null {
  if (mesas.length === 0) return null;
  if (mesas.length === 1) return mesas[0].id;
  return current && mesas.some((mesa) => mesa.id === current) ? current : null;
}

export function shouldShowMesaSelector(mesas: PresenceMesa[]): boolean {
  return mesas.length > 1;
}

export function presenceLabel(regime: string): string {
  return (
    (
      { green: "Verde", yellow: "Amarelo", blue: "Azul", red: "Vermelho" } as Record<string, string>
    )[regime] ?? regime
  );
}

export type MasterPresenceRow = {
  player_user_id: string;
  player_name: string | null;
  regime: "green" | "yellow" | "blue" | "red";
  updated_at: string | null;
};

export type MasterThreadSummary = {
  player_user_id: string;
  player_name: string | null;
  unread_count: number;
  last_message_at: string;
};

export function threadForPlayer(
  threads: MasterThreadSummary[],
  playerUserId: string,
): MasterThreadSummary | null {
  return threads.find((thread) => thread.player_user_id === playerUserId) ?? null;
}
