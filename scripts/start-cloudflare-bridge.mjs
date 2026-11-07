#!/usr/bin/env node
/**
 * Paperclip Cloudflare Tunnel + Pages Bridge Launcher
 *
 * 1. Ensures the local Paperclip API server is running on http://localhost:3100
 * 2. Ensures `paperclip-control-plane.pages.dev` is in PAPERCLIP_ALLOWED_HOSTNAMES
 * 3. Starts a Cloudflare Quick Tunnel (`cloudflared tunnel --url http://localhost:3100`)
 * 4. Captures the assigned `https://xxxx.trycloudflare.com` URL
 * 5. Updates `wrangler.toml` with the new TUNNEL_ORIGIN and deploys the updated
 *    Cloudflare Pages Function bridge so `https://paperclip-control-plane.pages.dev`
 *    automatically connects to the new tunnel!
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), "..");
const PAGES_HOST = "paperclip-control-plane.pages.dev";
const LOCAL_PORT = Number(process.env.PORT || 3100);
const CLOUDFLARED_PATHS = [
  "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
  "C:\\Program Files\\cloudflared\\cloudflared.exe",
  "cloudflared.exe",
  "cloudflared",
];

function findCloudflared() {
  for (const candidate of CLOUDFLARED_PATHS) {
    if (!candidate.includes("\\") || fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "cloudflared";
}

function ensureAllowedHostnames(extraHost) {
  const envPath = path.join(os.homedir(), ".paperclip", "instances", "default", ".env");
  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const hosts = new Set([PAGES_HOST]);
  if (extraHost) hosts.add(extraHost.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));

  const match = /^PAPERCLIP_ALLOWED_HOSTNAMES=(.*)$/m.exec(content);
  if (match) {
    for (const h of match[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      hosts.add(h);
    }
    content = content.replace(
      /^PAPERCLIP_ALLOWED_HOSTNAMES=.*$/m,
      `PAPERCLIP_ALLOWED_HOSTNAMES=${Array.from(hosts).join(",")}`,
    );
  } else {
    content = `${content.trim()}\nPAPERCLIP_ALLOWED_HOSTNAMES=${Array.from(hosts).join(",")}\n`.trimStart();
  }
  fs.writeFileSync(envPath, content, "utf8");
}

function updateWranglerToml(tunnelUrl) {
  const wranglerPath = path.join(ROOT_DIR, "wrangler.toml");
  if (!fs.existsSync(wranglerPath)) return;
  let content = fs.readFileSync(wranglerPath, "utf8");
  content = content.replace(
    /^TUNNEL_ORIGIN\s*=\s*".*"$/m,
    `TUNNEL_ORIGIN = "${tunnelUrl}"`,
  );
  fs.writeFileSync(wranglerPath, content, "utf8");
}

async function isServerHealthy() {
  try {
    const res = await fetch(`http://localhost:${LOCAL_PORT}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  ensureAllowedHostnames();

  const healthy = await isServerHealthy();
  if (!healthy) {
    console.log(`[1/3] Starting local Paperclip server on port ${LOCAL_PORT}...`);
    const serverProc = spawn("pnpm.cmd", ["dev:server"], {
      cwd: ROOT_DIR,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        PAPERCLIP_ALLOWED_HOSTNAMES: `${PAGES_HOST}`,
      },
    });
    serverProc.on("error", (err) => {
      console.error("[Paperclip Server Error]", err.message);
    });

    // Wait up to 45s for server health
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await isServerHealthy()) {
        console.log(`[OK] Local Paperclip server is healthy on http://localhost:${LOCAL_PORT}`);
        break;
      }
    }
  } else {
    console.log(`[1/3] Local Paperclip server is already running on http://localhost:${LOCAL_PORT}`);
  }

  console.log(`[2/3] Starting Cloudflare Quick Tunnel -> http://localhost:${LOCAL_PORT}...`);
  const cloudflaredBin = findCloudflared();
  const tunnelProc = spawn(cloudflaredBin, ["tunnel", "--url", `http://localhost:${LOCAL_PORT}`], {
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let capturedUrl = null;
  const handleOutput = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    if (!capturedUrl) {
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match) {
        capturedUrl = match[0];
        ensureAllowedHostnames(capturedUrl);
        updateWranglerToml(capturedUrl);
        console.log("\n===================================================");
        console.log(`  TUNNEL ACTIVE: ${capturedUrl}`);
        console.log(`  Direct Connect Link:`);
        console.log(`  https://${PAGES_HOST}/?tunnel_origin=${encodeURIComponent(capturedUrl)}`);
        console.log("===================================================\n");

        if (fs.existsSync(path.join(ROOT_DIR, "ui", "dist", "index.html"))) {
          console.log("[3/3] Updating Cloudflare Pages TUNNEL_ORIGIN binding...");
          const deployProc = spawn(
            "npx.cmd",
            ["wrangler", "pages", "deploy", "ui/dist", "--project-name", "paperclip-control-plane", "--branch", "main"],
            { cwd: ROOT_DIR, stdio: "inherit", shell: true },
          );
          deployProc.on("exit", (code) => {
            if (code === 0) {
              console.log(`\n[READY] https://${PAGES_HOST} is now live and bridged to your local PC!`);
            }
          });
        }
      }
    }
  };

  tunnelProc.stdout.on("data", handleOutput);
  tunnelProc.stderr.on("data", handleOutput);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
