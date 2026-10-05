#!/usr/bin/env node
const [cmd, ...args] = process.argv.slice(2);
const dropPendingUpdates = args.includes("--drop-pending-updates");
const url = args.find((arg) => !arg.startsWith("--"));
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (cmd === "set" && !secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is required for set");
const api = (method) => `https://api.telegram.org/bot${token}/${method}`;
async function call(method, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(api(method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });
    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error(`${method} failed: invalid_json`);
    }
    if (!res.ok || json.ok !== true)
      throw new Error(`${method} failed: ${json.description ?? res.status}`);
    console.log(JSON.stringify({ ok: true, result: json.result }, null, 2));
  } finally {
    clearTimeout(timeout);
  }
}
if (cmd === "set") {
  if (!url || !/^https:\/\//.test(url)) {
    throw new Error(
      "usage: bun scripts/telegram-webhook.mjs set https://<DEPLOY>/api/channels/telegram-dialogue [--drop-pending-updates]",
    );
  }
  await call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message"],
    max_connections: 1,
    ...(dropPendingUpdates ? { drop_pending_updates: true } : {}),
  });
} else if (cmd === "info") {
  await call("getWebhookInfo");
} else if (cmd === "delete") {
  await call("deleteWebhook", dropPendingUpdates ? { drop_pending_updates: true } : {});
} else {
  throw new Error("usage: bun scripts/telegram-webhook.mjs <set|info|delete> [url]");
}
