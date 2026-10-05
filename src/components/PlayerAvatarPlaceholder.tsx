import type { CSSProperties } from "react";

export const PLAYER_AVATAR_SPRITE_URL = "/brand-assets/player-avatar-sprite.webp";
export const PLAYER_AVATAR_COUNT = 12;

function normalizeIdentity(identity: string | null | undefined): string {
  return (identity ?? "").trim().toLocaleUpperCase("pt-BR");
}

export function playerAvatarSlot(
  identity: string | null | undefined,
  isSystemMaster = false,
): number {
  if (isSystemMaster || /\bRAAR\b|\bMESTRE\b/.test(normalizeIdentity(identity))) {
    return PLAYER_AVATAR_COUNT - 1;
  }

  const jogador = normalizeIdentity(identity).match(/\bJOGADOR[- _]?(\d{1,2})\b/);
  if (jogador) {
    return (Number(jogador[1]) - 1 + PLAYER_AVATAR_COUNT) % PLAYER_AVATAR_COUNT;
  }

  let hash = 0;
  for (const character of normalizeIdentity(identity)) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % PLAYER_AVATAR_COUNT;
}

export function playerAvatarStyle(slot: number): CSSProperties {
  const safeSlot = ((slot % PLAYER_AVATAR_COUNT) + PLAYER_AVATAR_COUNT) % PLAYER_AVATAR_COUNT;
  const column = safeSlot % 4;
  const row = Math.floor(safeSlot / 4);
  return {
    backgroundImage: `url(${PLAYER_AVATAR_SPRITE_URL})`,
    backgroundPosition: `${(column * 100) / 3}% ${(row * 100) / 2}%`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "400% 300%",
  };
}

type PlayerAvatarPlaceholderProps = {
  identity: string | null | undefined;
  isSystemMaster?: boolean;
  sizeClassName?: string;
};

export function PlayerAvatarPlaceholder({
  identity,
  isSystemMaster = false,
  sizeClassName = "h-24 w-24",
}: PlayerAvatarPlaceholderProps) {
  const slot = playerAvatarSlot(identity, isSystemMaster);
  return (
    <div
      aria-label={`Avatar ilustrado de ${identity?.trim() || "jogador"}`}
      className={`shrink-0 overflow-hidden rounded-full border border-[color:var(--wine)] bg-[color:var(--wine)]/60 ${sizeClassName}`}
      data-avatar-slot={slot}
      role="img"
      style={playerAvatarStyle(slot)}
      title="Avatar ilustrado"
    />
  );
}
