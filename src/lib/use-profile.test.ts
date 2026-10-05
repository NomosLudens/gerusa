import { describe, expect, it } from "vitest";
import { welcomeGreeting } from "./use-profile";

describe("welcomeGreeting", () => {
  it("uses the declared treatment preference", () => {
    expect(welcomeGreeting("ele_dele")).toBe("Bem-vindo de volta.");
    expect(welcomeGreeting("ela_dela")).toBe("Bem-vinda de volta.");
    expect(welcomeGreeting("elu_delu")).toBe("Bem-vinde de volta.");
  });

  it("fails closed to neutral treatment when no preference is available", () => {
    expect(welcomeGreeting(null)).toBe("Bem-vinde de volta.");
    expect(welcomeGreeting("not_informed")).toBe("Bem-vinde de volta.");
  });
});
