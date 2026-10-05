export type OwnedKallistisThread = {
  user_id: string;
  facet: string | null;
  surface: string | null;
};

export function isAuthorizedKallistisThread(
  thread: OwnedKallistisThread | null,
  userId: string,
  expectedSurface: "kallistis" | "telegram_dialogue" = "kallistis",
): boolean {
  return Boolean(
    thread &&
    thread.user_id === userId &&
    thread.facet === "kallistis" &&
    thread.surface === expectedSurface,
  );
}
