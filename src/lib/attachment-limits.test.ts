import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_TOTAL_BYTES, validateAttachmentTotal } from "./attachment-limits";

describe("attachment limits", () => {
  it("aceita dois arquivos cuja soma seja exatamente 8 MiB", () => {
    expect(validateAttachmentTotal([{ size: 4 * 1024 * 1024 }, { size: 4 * 1024 * 1024 }]).ok).toBe(
      true,
    );
  });

  it("recusa soma 8 MiB + 1 byte", () => {
    expect(validateAttachmentTotal([{ size: MAX_ATTACHMENT_TOTAL_BYTES + 1 }]).ok).toBe(false);
  });

  it("usa tamanho original e não tamanho de base64/texto extraído", () => {
    expect(validateAttachmentTotal([{ size: MAX_ATTACHMENT_TOTAL_BYTES }]).ok).toBe(true);
  });

  it("recusa cinco arquivos", () => {
    expect(validateAttachmentTotal(Array.from({ length: 5 }, () => ({ size: 1 }))).ok).toBe(false);
  });
});
