export type CharacterHumanStateKey =
  | "creating"
  | "ready"
  | "submitted"
  | "rejected"
  | "approved"
  | "archived";

export type CharacterHumanState = {
  key: CharacterHumanStateKey;
  playerLabel: string;
  masterLabel: string;
};

export function deriveCharacterDisplayState(input: {
  status: string;
  completo: boolean;
}): CharacterHumanState {
  if (input.status === "archived")
    return { key: "archived", playerLabel: "Arquivado", masterLabel: "Arquivado" };
  if (input.status === "submitted")
    return {
      key: "submitted",
      playerLabel: "Aguardando o Mestre",
      masterLabel: "Aguardando sua revisão",
    };
  if (input.status === "rejected")
    return { key: "rejected", playerLabel: "Devolvido para ajustes", masterLabel: "Devolvido" };
  if (input.status === "approved")
    return { key: "approved", playerLabel: "Aprovado", masterLabel: "Aprovado" };
  if (input.completo)
    return {
      key: "ready",
      playerLabel: "Pronto para enviar",
      masterLabel: "Pronto para o jogador enviar",
    };
  return { key: "creating", playerLabel: "Em criação", masterLabel: "Em criação" };
}
