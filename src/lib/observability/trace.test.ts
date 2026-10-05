import { describe, expect, it } from "vitest";
import { createTraceId } from "./trace";
import { sanitizeMetadata } from "./logger";

describe("observability helpers", () => {
  it("generates support trace ids", () => {
    expect(createTraceId()).toMatch(/^trc_[a-z0-9]{1,24}$/);
  });

  it("removes sensitive metadata", () => {
    expect(sanitizeMetadata({ token: "x", trace_id: "trc_ok", proofText: "full" })).toEqual({
      trace_id: "trc_ok",
    });
  });
});
