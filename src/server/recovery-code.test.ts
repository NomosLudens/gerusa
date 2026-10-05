import { describe, expect, it } from "vitest";
import {
  generateRecoveryCode,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "./recovery-code.server";

describe("KALLISTIS recovery code", () => {
  it("generates a formatted high-entropy code from the unambiguous alphabet", () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(
      /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}(?:-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}){3}$/,
    );
    expect(code).not.toMatch(/[01IO]/);
  });

  it("normalizes presentation separators without accepting another alphabet", () => {
    expect(normalizeRecoveryCode(" abcd-efgh-jklm-npqr ")).toBe("ABCDEFGHJKLMNPQR");
    expect(() => normalizeRecoveryCode("ABCD-EFGH-IJKL-MNOP")).toThrow();
    expect(() => normalizeRecoveryCode("ABCD-EFGH-JKMN-PQRS-1")).toThrow();
  });

  it("uses a deterministic peppered digest and never requires the plaintext for storage", async () => {
    const first = await hashRecoveryCode("ABCD-EFGH-JKLM-NPQR", "test-recovery-pepper");
    const second = await hashRecoveryCode("abcd efgh jklm npqr", "test-recovery-pepper");
    const otherPepper = await hashRecoveryCode("ABCD-EFGH-JKMN-PQRS", "other-pepper");
    expect(first).toBe(second);
    expect(first).not.toBe(otherPepper);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toContain("ABCD");
  });
});
