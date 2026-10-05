import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

describe("public product integrity", () => {
  it("não publica superfícies simuladas", () => {
    expect(existsSync("public/kallistis-presente/index.html")).toBe(false);
    expect(existsSync("public/modo-fala-klio/index.html")).toBe(false);

    for (const file of listFiles("public")) {
      const content = readFileSync(file);
      expect(content.includes(Buffer.from("FAKE_USER")), file).toBe(false);
      expect(content.includes(Buffer.from("FAKE_REPLY")), file).toBe(false);
    }
  });
});
