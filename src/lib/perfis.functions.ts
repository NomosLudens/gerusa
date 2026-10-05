// Fluxos de workspace/perfis secundários foram arquivados na Kallistis Clean pessoal.
// As exports permanecem somente para compatibilidade de import legado; qualquer chamada
// runtime falha explicitamente sem service role, sem criar vínculo e sem ler dados de terceiros.
import { createServerFn } from "@tanstack/react-start";

function archivedWorkspaceFlow(): never {
  throw new Error("Fluxo de convites/workspace arquivado na Kallistis Clean pessoal.");
}

export const createInvite = createServerFn({ method: "POST" }).handler(archivedWorkspaceFlow);
export const revokeInvite = createServerFn({ method: "POST" }).handler(archivedWorkspaceFlow);
export const acceptInvite = createServerFn({ method: "POST" }).handler(archivedWorkspaceFlow);
export const updateMemberModules = createServerFn({ method: "POST" }).handler(
  archivedWorkspaceFlow,
);
export const removeMember = createServerFn({ method: "POST" }).handler(archivedWorkspaceFlow);
export const saveInitialContext = createServerFn({ method: "POST" }).handler(archivedWorkspaceFlow);
export const getMemberInitialContext = createServerFn({ method: "GET" }).handler(
  archivedWorkspaceFlow,
);
export const getAdminMetrics = createServerFn({ method: "GET" }).handler(archivedWorkspaceFlow);

export type InviteWithLink = never;
