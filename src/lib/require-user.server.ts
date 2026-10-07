import { gerusaCoreRequest } from "@/server/gerusa/store";
import { readSessionCookie } from "@/server/local-core/cookies";

export async function requireUser(
  request: Request,
): Promise<{ userId: string } | { error: Response }> {
  const token = readSessionCookie(request.headers.get("cookie"));
  if (!token) {
    return {
      error: Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  try {
    const result = await gerusaCoreRequest<{ user: { id: string } }>("/auth/session", {}, token);
    return { userId: result.user.id };
  } catch {
    return {
      error: Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
}
