import { APP_REGISTRY, type AppRegistryItem } from "@/lib/app-registry";

/**
 * Superfícies que TAL pode liberar ou ocultar para jogadores.
 * Superfícies administrativas e a Mesa do Mestre nunca entram nesta lista.
 */
export const PLAYER_ACCESS_APPS: AppRegistryItem[] = APP_REGISTRY.filter(
  (app) => app.sidebar && app.status === "real" && !app.adminOnly && app.id !== "mesa-do-mestre",
);

export const PLAYER_ACCESS_APP_IDS = PLAYER_ACCESS_APPS.map((app) => app.id);

export function isPlayerAccessAppId(value: unknown): value is string {
  return typeof value === "string" && PLAYER_ACCESS_APP_IDS.includes(value);
}
