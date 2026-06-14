import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const confPath = path.join(root, "orchestrator-desktop/src-tauri/tauri.conf.json");

const thumb = process.env.WINDOWS_CERTIFICATE_THUMBPRINT?.replace(/\s/g, "");
if (!thumb) {
  process.exit(0);
}

const conf = JSON.parse(fs.readFileSync(confPath, "utf8"));
conf.bundle ??= {};
conf.bundle.windows = {
  ...conf.bundle.windows,
  certificateThumbprint: thumb,
  digestAlgorithm: process.env.WINDOWS_DIGEST_ALGORITHM || "sha256",
  timestampUrl: process.env.WINDOWS_TIMESTAMP_URL || "http://timestamp.digicert.com",
};

fs.writeFileSync(confPath, `${JSON.stringify(conf, null, 2)}\n`);
console.log("[signing] tauri.conf.json: certificateThumbprint configurado");
