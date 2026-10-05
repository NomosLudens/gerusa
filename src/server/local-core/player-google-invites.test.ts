import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "./postgres";
import {
  claimPlayerInvite,
  createPlayerInviteOAuthState,
  digestPlayerInviteToken,
  generateOpaquePlayerInviteToken,
  getPlayerInviteStatus,
  PLAYER_INVITE_LABELS,
} from "./player-google-invites";

type Invite = {
  id: string;
  player_label: string;
  token_hash: string | null;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  revoked_at: string | null;
};

type State = {
  invite_id: string | null;
  display_name: string | null;
  pronouns: string | null;
  expires_at: number;
  consumed_at: string | null;
};

class FakeInviteSql implements SqlExecutor {
  invites: Invite[] = [];
  states = new Map<string, State>();
  profiles = new Map<string, { display_name: string; pronouns: string }>();
  private queue = Promise.resolve();

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    statement: string,
    parameters: readonly unknown[] = [],
  ): Promise<readonly T[]> {
    if (statement.includes("SELECT claimed_by_user_id, revoked_at")) {
      const row = this.invites.find((invite) => invite.token_hash === parameters[0]);
      return (row
        ? [{ claimed_by_user_id: row.claimed_by_user_id, revoked_at: row.revoked_at }]
        : []) as unknown as readonly T[];
    }
    if (statement.includes("INSERT INTO public.player_invite_oauth_states")) {
      const tokenHash = statement.includes("SELECT $1, id") ? String(parameters[4]) : null;
      const invite = tokenHash ? this.invites.find((item) => item.token_hash === tokenHash) : null;
      if (statement.includes("SELECT $1, id") && (!invite || invite.claimed_by_user_id))
        return [] as unknown as readonly T[];
      this.states.set(String(parameters[0]), {
        invite_id: invite?.id ?? null,
        display_name: (parameters[1] as string | null) ?? null,
        pronouns: (parameters[2] as string | null) ?? null,
        expires_at: Date.now() + 60_000,
        consumed_at: null,
      });
      return [{ state_hash: String(parameters[0]) }] as unknown as readonly T[];
    }
    if (statement.includes("SELECT invite_id::text, display_name, pronouns")) {
      const state = this.states.get(String(parameters[0]));
      if (!state || state.expires_at <= Date.now()) return [] as unknown as readonly T[];
      return [
        {
          invite_id: state.invite_id,
          display_name: state.display_name,
          pronouns: state.pronouns,
          consumed_at: state.consumed_at,
          expires_at: new Date(state.expires_at).toISOString(),
        },
      ] as unknown as readonly T[];
    }
    if (statement.includes("WHERE id = $1") && statement.includes("FOR UPDATE")) {
      const invite = this.invites.find((item) => item.id === parameters[0]);
      return (invite ? [invite] : []) as unknown as readonly T[];
    }
    if (statement.includes("claimed_by_user_id = $1") && statement.includes("LIMIT 1")) {
      const invite = this.invites.find((item) => item.claimed_by_user_id === parameters[0]);
      return (invite ? [invite] : []) as unknown as readonly T[];
    }
    if (statement.includes("player_label ~ $1")) {
      const invite = [...this.invites]
        .filter(
          (item) =>
            /^JOGADOR-(0[2-9]|1[0-9]|2[0-5])$/.test(item.player_label) &&
            !item.claimed_by_user_id &&
            !item.revoked_at,
        )
        .sort((a, b) => a.player_label.localeCompare(b.player_label))[0];
      return (invite ? [invite] : []) as unknown as readonly T[];
    }
    if (statement.includes("UPDATE public.player_invites")) {
      const invite = this.invites.find((item) => item.id === parameters[1]);
      if (!invite || invite.claimed_by_user_id || invite.revoked_at)
        return [] as unknown as readonly T[];
      invite.claimed_by_user_id = String(parameters[0]);
      invite.claimed_at = new Date().toISOString();
      return [
        { player_label: invite.player_label, claimed_at: invite.claimed_at },
      ] as unknown as readonly T[];
    }
    if (statement.includes("INSERT INTO public.profiles")) {
      this.profiles.set(String(parameters[0]), {
        display_name: String(parameters[1]),
        pronouns: String(parameters[2]),
      });
      return [] as unknown as readonly T[];
    }
    if (statement.includes("UPDATE public.player_invite_oauth_states")) {
      const state = this.states.get(String(parameters[0]));
      if (state) {
        if (parameters.length > 1) state.invite_id = String(parameters[1]);
        state.consumed_at = new Date().toISOString();
      }
      return [] as unknown as readonly T[];
    }
    throw new Error(`Unhandled SQL: ${statement}`);
  }

  close(): void {}

  transaction<T>(fn: (transaction: SqlExecutor) => Promise<T>): Promise<T> {
    const result = this.queue.then(() => fn(this));
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

function seedSlots(): FakeInviteSql {
  const sql = new FakeInviteSql();
  for (let index = 1; index <= 25; index += 1) {
    const label = `JOGADOR-${String(index).padStart(2, "0")}`;
    sql.invites.push({
      id: `invite-${index}`,
      player_label: label,
      token_hash: index === 1 ? digestPlayerInviteToken("token-01") : null,
      claimed_by_user_id: index === 1 ? "existing-user" : null,
      claimed_at: index === 1 ? new Date().toISOString() : null,
      revoked_at: null,
    });
  }
  return sql;
}

describe("Google player invite claim", () => {
  it("defines exactly the canonical 25 labels and opaque tokens", () => {
    expect(PLAYER_INVITE_LABELS).toHaveLength(25);
    expect(PLAYER_INVITE_LABELS[0]).toBe("JOGADOR-01");
    expect(PLAYER_INVITE_LABELS.at(-1)).toBe("JOGADOR-25");
    const generated = generateOpaquePlayerInviteToken();
    expect(generated).not.toContain("JOGADOR");
    expect(generated).toHaveLength(43);
    expect(digestPlayerInviteToken(generated)).not.toBe(generated);
  });

  it("preserves JOGADOR-01 and assigns the first new claim to JOGADOR-02", async () => {
    const sql = seedSlots();
    const state = await createPlayerInviteOAuthState(sql, null);
    const claim = await claimPlayerInvite(sql, state, "user-02");

    expect(claim.player_label).toBe("JOGADOR-02");
    expect(sql.invites[0]?.claimed_by_user_id).toBe("existing-user");
    expect(sql.invites[1]?.claimed_by_user_id).toBe("user-02");
  });

  it("skips occupied slots and assigns the smallest free label", async () => {
    const sql = seedSlots();
    sql.invites[1]!.claimed_by_user_id = "occupied-user";
    sql.invites[1]!.claimed_at = new Date().toISOString();
    const state = await createPlayerInviteOAuthState(sql, null);

    await expect(claimPlayerInvite(sql, state, "user-03")).resolves.toMatchObject({
      player_label: "JOGADOR-03",
    });
  });

  it("is idempotent for the same authenticated account", async () => {
    const sql = seedSlots();
    const firstState = await createPlayerInviteOAuthState(sql, null);
    const secondState = await createPlayerInviteOAuthState(sql, null, {
      display_name: "Nome confirmado",
      pronouns: "elu/delu",
    });
    const first = await claimPlayerInvite(sql, firstState, "same-user");
    const second = await claimPlayerInvite(sql, secondState, "same-user");

    expect(second.player_label).toBe(first.player_label);
    expect(sql.invites.filter((invite) => invite.claimed_by_user_id === "same-user")).toHaveLength(
      1,
    );
    expect(sql.profiles.get("same-user")).toEqual({
      display_name: "Nome confirmado",
      pronouns: "elu/delu",
    });
  });

  it("allocates unique sequential labels under concurrent claims", async () => {
    const sql = seedSlots();
    const states = await Promise.all(
      Array.from({ length: 24 }, () => createPlayerInviteOAuthState(sql, null)),
    );
    const results = await Promise.all(
      states.map((state, index) => claimPlayerInvite(sql, state, `user-${index + 2}`)),
    );
    const labels = results.map((result) => result.player_label).sort();

    expect(new Set(labels).size).toBe(24);
    expect(labels[0]).toBe("JOGADOR-02");
    expect(labels.at(-1)).toBe("JOGADOR-25");
    await expect(
      claimPlayerInvite(sql, await createPlayerInviteOAuthState(sql, null), "user-26"),
    ).rejects.toThrow("invite_capacity_exhausted");
  });

  it("keeps the existing token flow and materializes its supplied identity", async () => {
    const sql = seedSlots();
    sql.invites[1]!.token_hash = digestPlayerInviteToken("token-02");
    const state = await createPlayerInviteOAuthState(sql, "token-02", {
      display_name: "Caio",
      pronouns: "ele/dele",
    });
    const claim = await claimPlayerInvite(sql, state, "legacy-user");

    expect(claim.player_label).toBe("JOGADOR-02");
    expect(sql.profiles.get("legacy-user")).toEqual({
      display_name: "Caio",
      pronouns: "ele/dele",
    });
  });

  it("rejects a consumed state replayed by another user", async () => {
    const sql = seedSlots();
    const state = await createPlayerInviteOAuthState(sql, null);
    await claimPlayerInvite(sql, state, "user-a");
    await expect(claimPlayerInvite(sql, state, "user-b")).rejects.toThrow(
      "invite_state_replay_forbidden",
    );
  });

  it("validates legacy token status without exposing the token", async () => {
    const sql = seedSlots();
    await expect(getPlayerInviteStatus(sql, "token-01")).resolves.toBe("ALREADY_CLAIMED");
    await expect(getPlayerInviteStatus(sql, "wrong-token")).resolves.toBe("INVALID");
  });
});
