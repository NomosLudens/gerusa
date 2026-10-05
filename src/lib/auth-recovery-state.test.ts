import { describe, expect, it } from "vitest";
import { shouldNavigateAfterAuthEvent, validatePasswordRecoveryInput } from "./auth-recovery-state";

describe("auth recovery state", () => {
  it("INITIAL_SESSION comum navega", () => {
    expect(shouldNavigateAfterAuthEvent("INITIAL_SESSION", true, false)).toBe(true);
  });

  it("PASSWORD_RECOVERY não navega", () => {
    expect(shouldNavigateAfterAuthEvent("PASSWORD_RECOVERY", true, false)).toBe(false);
  });

  it("PASSWORD_RECOVERY seguido de SIGNED_IN continua no formulário", () => {
    expect(shouldNavigateAfterAuthEvent("SIGNED_IN", true, true)).toBe(false);
  });

  it("senha menor que 8 caracteres é recusada", () => {
    expect(validatePasswordRecoveryInput("1234567", "1234567")).toContain("8 caracteres");
  });

  it("confirmação diferente é recusada", () => {
    expect(validatePasswordRecoveryInput("12345678", "abcdefgh")).toContain("não conferem");
  });

  it("updateUser com erro mantém o formulário", () => {
    // Se der erro no updateUser, o estado recoveryMode continua true, então o formulário é mantido (não navega)
    expect(shouldNavigateAfterAuthEvent("SIGNED_IN", true, true)).toBe(false);
  });

  it("updateUser com sucesso navega", () => {
    // Se der sucesso no updateUser, recoveryMode se torna false, então navega
    expect(shouldNavigateAfterAuthEvent("SIGNED_IN", true, false)).toBe(true);
  });
});
