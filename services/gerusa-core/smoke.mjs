import { Pool } from "pg";

const baseUrl = process.env.GERUSA_CORE_URL;
const secret = process.env.GERUSA_CORE_SECRET;
const databaseUrl = process.env.GERUSA_DATABASE_URL;
if (!baseUrl || !secret || !databaseUrl)
  throw new Error("Gerusa Core smoke configuration is incomplete");

const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const endpoint = (path) => new URL(path, baseUrl);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const health = await fetch(endpoint("/health"), { cache: "no-store" });
assert(health.status === 200, "core_health_failed");
console.log("CORE_HEALTH=PASS");

const denied = await fetch(endpoint("/threads"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
assert(denied.status === 401, "core_authentication_failed");
console.log("CORE_UNAUTHORIZED_REQUEST=PASS");

const created = await fetch(endpoint("/threads"), { method: "POST", headers, body: "{}" });
assert(created.status === 201, "core_thread_create_failed");
const { thread } = await created.json();
assert(typeof thread?.id === "string", "core_thread_id_missing");

const pool = new Pool({
  connectionString: databaseUrl,
  application_name: "gerusa-core-smoke",
  max: 1,
});
try {
  for (const [role, content] of [
    ["user", "Gerusa Core smoke user message"],
    ["assistant", "Gerusa Core smoke assistant message"],
  ]) {
    const written = await fetch(endpoint(`/threads/${thread.id}/messages`), {
      method: "POST",
      headers,
      body: JSON.stringify({ role, content }),
    });
    assert(written.status === 201, `core_${role}_write_failed`);
  }

  const restored = await fetch(endpoint(`/threads/${thread.id}/messages`), {
    headers,
    cache: "no-store",
  });
  assert(restored.status === 200, "core_history_read_failed");
  const history = await restored.json();
  assert(
    history.messages?.length === 2 &&
      history.messages[0].role === "user" &&
      history.messages[1].role === "assistant",
    "core_history_contents_mismatch",
  );
  console.log("CORE_WRITE_READ=PASS");
} finally {
  await pool.query("DELETE FROM gerusa.conversations WHERE id = $1", [thread.id]);
  await pool.end();
}

console.log("CORE_TEST_DATA_CLEANUP=PASS");
