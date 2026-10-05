import { describe, expect, it } from "vitest";
import {
  presenceLabel,
  resolveMesaSelection,
  shouldShowMesaSelector,
  threadForPlayer,
} from "@/lib/presence-ui";

const mesas = [
  { id: "one", name: "Uma" },
  { id: "two", name: "Duas" },
];

describe("presence UI contracts", () => {
  it("auto-selects exactly one mesa and never silently selects among many", () => {
    expect(resolveMesaSelection([], null)).toBeNull();
    expect(resolveMesaSelection([mesas[0]], null)).toBe("one");
    expect(resolveMesaSelection(mesas, null)).toBeNull();
    expect(resolveMesaSelection(mesas, "two")).toBe("two");
    expect(shouldShowMesaSelector([])).toBe(false);
    expect(shouldShowMesaSelector(mesas)).toBe(true);
  });
  it("keeps canonical regime labels and exact master thread ownership", () => {
    expect(presenceLabel("red")).toBe("Vermelho");
    expect(
      threadForPlayer(
        [{ player_user_id: "p", player_name: "P", unread_count: 2, last_message_at: "" }],
        "p",
      )?.unread_count,
    ).toBe(2);
    expect(
      threadForPlayer(
        [{ player_user_id: "other", player_name: "O", unread_count: 8, last_message_at: "" }],
        "p",
      ),
    ).toBeNull();
  });
});
