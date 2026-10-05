/**
 * Transitional boundary for the local PostgreSQL core.
 *
 * The local session is real, but product surfaces that still read Supabase
 * must not be exposed under that session. Keeping this as an explicit error
 * prevents a local-authenticated browser from silently entering a legacy
 * data path.
 */
export const LOCAL_CORE_TRANSITION_MESSAGE =
  "A sessão local está ativa, mas as superfícies de produto ainda aguardam a migração para PostgreSQL local. Nenhum dado legado foi consultado.";

export class LocalCoreTransitionError extends Error {
  readonly code = "local_core_transition";

  constructor() {
    super(LOCAL_CORE_TRANSITION_MESSAGE);
    this.name = "LocalCoreTransitionError";
  }
}

export function localCoreTransition(): never {
  throw new LocalCoreTransitionError();
}
