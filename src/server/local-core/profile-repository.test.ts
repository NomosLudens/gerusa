import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "./postgres";
import { getProfileForUser, upsertProfileForUser } from "./postgres-repositories";

function fakeSql(
  rows: Record<string, unknown>[] = [],
): SqlExecutor & { calls: string[]; params: unknown[][] } {
  const value = {
    calls: [] as string[],
    params: [] as unknown[][],
    async query<T extends Record<string, unknown>>(
      statement: string,
      parameters: readonly unknown[] = [],
    ) {
      value.calls.push(statement);
      value.params.push([...parameters]);
      return rows as T[];
    },
    close() {},
  };
  return value;
}

describe("local profile repository", () => {
  it("reads only the profile owned by the session user", async () => {
    const sql = fakeSql([]);
    expect(await getProfileForUser(sql, "user-a")).toBeNull();
    expect(sql.params).toEqual([["user-a"]]);
    expect(sql.calls[0]).toContain("WHERE id = $1");
  });

  it("upserts using the session user id and only profile fields", async () => {
    const profile = {
      id: "user-a",
      display_name: "A",
      pronouns: "ela/dela",
      avatar_url: null,
      gender: "neutro",
      created_at: "now",
      updated_at: "now",
    };
    const sql = fakeSql([profile]);
    const result = await upsertProfileForUser(sql, "user-a", {
      display_name: "A",
      pronouns: "ela/dela",
      avatar_url: null,
      gender: "neutro",
    });
    expect(result).toEqual(profile);
    expect(sql.params).toEqual([["user-a", "A", "ela/dela", null, "neutro"]]);
    expect(sql.calls[0]).toContain("ON CONFLICT (id) DO UPDATE");
    expect(sql.calls[0]).not.toContain("user_id");
  });
});
