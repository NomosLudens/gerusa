#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const EXPECTED = Object.freeze({
  project: "KALLISTIS",
  authority: "RECOVERY",
  repoPath: "/home/tonyus-dev/Portifolio/KALLISTIS_RECOVERY/kallistis-clean",
  workerName: "kallistis-recovery",
  supabaseProjectRef: "gidsdflkjuaoxhejudna",
  hyperdriveId: "3efd826cb1dd4fc7afdd91b8a8cc702a",
  r2Bucket: "kallistis-media",
});

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function firstMatch(text, pattern) {
  return text?.match(pattern)?.[1] ?? null;
}

function tomlBlocks(text, name) {
  const pattern = new RegExp(`\\[\\[${name}\\]\\]([\\s\\S]*?)(?=\\n\\[|$)`, "g");
  return [...(text?.matchAll(pattern) ?? [])].map((match) => match[1]);
}

function valuesFromBlocks(blocks, key) {
  return blocks
    .map((block) => firstMatch(block, new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, "m")))
    .filter(Boolean);
}

function authorityFileMatches(lock) {
  return (
    lock?.project === EXPECTED.project &&
    lock?.authority === EXPECTED.authority &&
    lock?.repo_path === EXPECTED.repoPath &&
    lock?.worker_name === EXPECTED.workerName &&
    lock?.supabase_project_ref === EXPECTED.supabaseProjectRef &&
    lock?.hyperdrive_id === EXPECTED.hyperdriveId &&
    lock?.r2_bucket === EXPECTED.r2Bucket &&
    lock?.legacy_allowed === false
  );
}

function repositoryRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function printFailure(failures) {
  console.log("AUTHORITY_CHECK=FAIL");
  for (const failure of failures) console.log(failure);
  console.error("REFUSED: this is not the authoritative KALLISTIS recovery environment.");
  process.exitCode = 1;
}

function configurationFailures(authority, wranglerText) {
  const failures = [];
  if (!authorityFileMatches(authority)) failures.push("AUTHORITY_FILE=REFUSED");

  const workerName = firstMatch(wranglerText, /^\s*name\s*=\s*"([^"]+)"/m);
  const supabaseUrl = firstMatch(wranglerText, /^\s*SUPABASE_URL\s*=\s*"([^"]+)"/m);
  const hyperdriveIds = valuesFromBlocks(tomlBlocks(wranglerText, "hyperdrive"), "id");
  const r2Buckets = valuesFromBlocks(tomlBlocks(wranglerText, "r2_buckets"), "bucket_name");

  let supabaseProjectRef = null;
  try {
    const url = new URL(supabaseUrl ?? "");
    const [projectRef] = url.hostname.split(".");
    if (url.protocol === "https:" && url.hostname.endsWith(".supabase.co")) {
      supabaseProjectRef = projectRef;
    }
  } catch {
    supabaseProjectRef = null;
  }

  const checks = [
    [workerName === EXPECTED.workerName, "WRONG_WORKER=REFUSED"],
    [supabaseProjectRef === EXPECTED.supabaseProjectRef, "WRONG_SUPABASE=REFUSED"],
    [
      hyperdriveIds.length === 1 && hyperdriveIds[0] === EXPECTED.hyperdriveId,
      "WRONG_HYPERDRIVE=REFUSED",
    ],
    [r2Buckets.length === 1 && r2Buckets[0] === EXPECTED.r2Bucket, "WRONG_R2=REFUSED"],
  ];

  for (const [matches, failure] of checks) {
    if (!matches) failures.push(failure);
  }
  return failures;
}

function main() {
  const currentPath = process.cwd();
  const gitRoot = repositoryRoot();

  if (currentPath !== EXPECTED.repoPath || gitRoot !== EXPECTED.repoPath) {
    printFailure(["WRONG_REPOSITORY=REFUSED"]);
    return;
  }

  const authorityText = readText(resolve(currentPath, ".kallistis-authority.json"));
  let authority;
  try {
    authority = JSON.parse(authorityText ?? "");
  } catch {
    authority = null;
  }

  const wranglerText = readText(resolve(currentPath, "wrangler.toml"));
  const failures = configurationFailures(authority, wranglerText);

  if (failures.length > 0) {
    printFailure(failures);
    return;
  }

  console.log("AUTHORITY_CHECK=PASS");
  console.log("REPO_MATCH=PASS");
  console.log("WORKER_MATCH=PASS");
  console.log("SUPABASE_MATCH=PASS");
  console.log("HYPERDRIVE_MATCH=PASS");
  console.log("R2_MATCH=PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) main();

export {
  EXPECTED,
  authorityFileMatches,
  configurationFailures,
  main,
  tomlBlocks,
  valuesFromBlocks,
};
