export type LocalSessionUser = { id: string };
export type LocalSessionResponse = { user: LocalSessionUser };

async function readResponse(response: Response): Promise<LocalSessionResponse | null> {
  if (response.status === 401) return null;
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(typeof body?.error === "string" ? body.error : "Falha na sessão Gerusa");
  }
  return (await response.json()) as LocalSessionResponse;
}

export async function getLocalSession(): Promise<LocalSessionResponse | null> {
  return readResponse(
    await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    }),
  );
}

/** Kept as a compatibility export for callers inherited from the old shell. */
export async function restoreLocalSessionFromSupabase(): Promise<LocalSessionResponse | null> {
  return getLocalSession();
}

export async function signInLocal(email: string, password: string): Promise<LocalSessionResponse> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const result = await readResponse(response);
  if (!result) throw new Error("E-mail ou senha inválidos");
  return result;
}

export async function establishServerSession(_accessToken: string): Promise<LocalSessionResponse> {
  throw new Error("Acesso OAuth externo indisponível nesta superfície Gerusa");
}

export async function signOutLocal(): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok && response.status !== 401) throw new Error("Falha ao encerrar sessão");
}
