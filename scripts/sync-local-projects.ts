#!/usr/bin/env -S node --import ./server/node_modules/tsx/dist/loader.mjs
import net from "node:net";
import { createDb } from "../packages/db/src/client.js";
import { companies } from "../packages/db/src/schema/index.js";
import { resolveDefaultEmbeddedPostgresDir } from "../packages/shared/src/home-paths.js";
import { scanAndSyncLocalProjects } from "../server/src/services/local-project-scanner.js";

function isPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function syncProjectsToPaperclip(options: { targetCompanyId?: string; baseDir?: string } = {}) {
  const port = 54329;
  const dbUrl = process.env.DATABASE_URL || `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;
  const portOpen = await isPortOpen(port);

  let embeddedPostgresInstance: any = null;

  if (!process.env.DATABASE_URL && !portOpen) {
    console.log(`[sync-projects] Embedded Postgres is not running on port ${port}. Starting temporary instance...`);
    const EmbeddedPostgres = (await import("../server/node_modules/embedded-postgres/dist/index.js")).default;
    const dbDir = resolveDefaultEmbeddedPostgresDir();
    embeddedPostgresInstance = new EmbeddedPostgres({
      databaseDir: dbDir,
      port,
      user: "paperclip",
      password: "paperclip",
      persistent: true,
    });
    await embeddedPostgresInstance.start();
    console.log(`[sync-projects] Embedded Postgres started on port ${port}.`);
  } else {
    console.log(`[sync-projects] Connected to PostgreSQL on ${dbUrl}`);
  }

  try {
    const db = createDb(dbUrl);

    // Find target company
    const allCompanies = await db.select().from(companies);
    let targetCompany = allCompanies.find((c) =>
      options.targetCompanyId ? c.id === options.targetCompanyId : c.status === "active",
    );

    if (!targetCompany) {
      targetCompany = allCompanies[0];
    }

    if (!targetCompany) {
      console.error("[sync-projects] Error: No company found in Paperclip database.");
      return;
    }

    console.log(`[sync-projects] Target company: "${targetCompany.name}" (${targetCompany.id})`);

    const result = await scanAndSyncLocalProjects(db, targetCompany.id, { baseDir: options.baseDir });

    console.log(`\n======================================================`);
    console.log(`[sync-projects] Discovered ${result.totalDiscovered} local projects in Y:\\Local Projects`);
    console.log(`======================================================`);

    for (const p of result.projects) {
      const agBadge = p.isAntigravity ? " [Antigravity]" : "";
      const statusBadge = p.isNew ? " (NEW)" : "";
      console.log(`  ✓ ${p.name}${agBadge}${statusBadge} -> ${p.fullPath}`);
    }

    console.log(`\n======================================================`);
    console.log(`[sync-projects] Sync Completed Successfully!`);
    console.log(`  - Newly Created Projects: ${result.createdCount}`);
    console.log(`  - Updated Projects:        ${result.updatedCount}`);
    console.log(`  - Already Up-to-date:      ${result.unchangedCount}`);
    console.log(`  - Total Discovered:        ${result.totalDiscovered}`);
    console.log(`======================================================\n`);
  } finally {
    if (embeddedPostgresInstance) {
      console.log(`[sync-projects] Stopping temporary Embedded Postgres instance...`);
      await embeddedPostgresInstance.stop();
      console.log(`[sync-projects] Stopped.`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith("sync-local-projects.ts")) {
  syncProjectsToPaperclip().catch((err) => {
    console.error("[sync-projects] Fatal error:", err);
    process.exit(1);
  });
}
