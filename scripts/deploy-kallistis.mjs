#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const repoPath = "/home/tonyus-dev/Portifolio/KALLISTIS_RECOVERY/kallistis-clean";
const guardPath = join(repoPath, "scripts/assert-kallistis-authority.mjs");
const wranglerPath = join(
  repoPath,
  "node_modules/.bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler",
);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoPath, stdio: "inherit" });
  if (result.error) {
    console.error(`REFUSED: could not execute ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [guardPath]);
run("bun", ["run", "build"]);

if (!existsSync(wranglerPath)) {
  console.error(
    "REFUSED: local Wrangler binary is not installed in the authoritative Recovery checkout.",
  );
  process.exit(1);
}

run(wranglerPath, ["deploy", "--config", join(repoPath, "wrangler.toml")]);
