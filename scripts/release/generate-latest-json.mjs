#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const artifactsDir = process.argv[2];
const version = process.argv[3]?.replace(/^v/, "");
const tag = process.argv[3]?.startsWith("v") ? process.argv[3] : `v${process.argv[3]}`;
const repo = process.argv[4] ?? "SafraPC/orchestrator";

if (!artifactsDir || !version) {
  console.error("Usage: generate-latest-json.mjs <artifacts-dir> <version-tag> [owner/repo]");
  process.exit(1);
}

const baseUrl = `https://github.com/${repo}/releases/download/${tag}`;
const platforms = {};

for (const sigPath of findFiles(artifactsDir, ".sig")) {
  const bundlePath = sigPath.slice(0, -4);
  const name = basename(bundlePath);
  const key = platformKey(name, bundlePath);
  if (!key) {
    continue;
  }
  const signature = readFileSync(sigPath, "utf8").trim();
  platforms[key] = {
    signature,
    url: `${baseUrl}/${encodeURIComponent(name)}`,
  };
}

if (Object.keys(platforms).length === 0) {
  console.error("Nenhum artefato de updater (.sig) encontrado em", artifactsDir);
  process.exit(1);
}

const manifest = {
  version,
  notes: `Orchestrator ${version}`,
  pub_date: new Date().toISOString(),
  platforms,
};

const out = join(artifactsDir, "latest.json");
writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Wrote", out);
console.log(JSON.stringify(manifest, null, 2));

function findFiles(dir, suffix) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...findFiles(full, suffix));
    } else if (entry.endsWith(suffix)) {
      out.push(full);
    }
  }
  return out;
}

function platformKey(fileName, fullPath) {
  const lower = fileName.toLowerCase();
  const pathLower = fullPath.toLowerCase();
  if (lower.endsWith(".exe") || pathLower.includes("/nsis/")) {
    if (lower.includes("aarch64") || lower.includes("arm64")) {
      return "windows-aarch64";
    }
    return "windows-x86_64";
  }
  if (lower.endsWith(".appimage") || pathLower.includes("/appimage/")) {
    if (lower.includes("aarch64") || lower.includes("arm64")) {
      return "linux-aarch64";
    }
    return "linux-x86_64";
  }
  if (lower.endsWith(".tar.gz") || pathLower.includes("/macos/")) {
    if (lower.includes("aarch64") || lower.includes("arm64")) {
      return "darwin-aarch64";
    }
    return "darwin-x86_64";
  }
  return null;
}
