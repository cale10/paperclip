import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Db } from "@paperclipai/db";
import { companies, projects, projectWorkspaces } from "@paperclipai/db";
import { eq, and } from "drizzle-orm";
import { PROJECT_COLORS } from "@paperclipai/shared";

export interface DiscoveredProject {
  category: string;
  name: string;
  fullPath: string;
  description: string;
  repoUrl: string | null;
  gitBranch: string | null;
  color: string;
  isAntigravityWorkspace: boolean;
}

export interface LocalProjectScanResult {
  success: boolean;
  totalDiscovered: number;
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  projects: Array<{
    name: string;
    fullPath: string;
    isAntigravity: boolean;
    isNew: boolean;
  }>;
}

function getReadmeSummary(dir: string): string {
  const readmeNames = ["README.md", "readme.md", "Readme.md", "README"];
  const found = readmeNames.find((f) => fs.existsSync(path.join(dir, f)));
  if (!found) return "";
  try {
    const content = fs.readFileSync(path.join(dir, found), "utf8");
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line.startsWith("#") && !line.startsWith("[") && !line.startsWith("!") && line.length > 5) {
        const cleaned = line.replace(/[*_`]/g, "").trim();
        return cleaned.length > 200 ? cleaned.slice(0, 197) + "..." : cleaned;
      }
    }
  } catch {}
  return "";
}

function getPackageDescription(dir: string): string {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return "";
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (typeof pkg.description === "string" && pkg.description.trim()) {
      return pkg.description.trim();
    }
  } catch {}
  return "";
}

function getGitMetadata(dir: string): { repoUrl: string | null; gitBranch: string | null } {
  const gitDir = path.join(dir, ".git");
  if (!fs.existsSync(gitDir)) {
    return { repoUrl: null, gitBranch: null };
  }
  let repoUrl: string | null = null;
  let gitBranch: string | null = null;
  try {
    const rawRemote = execSync("git remote get-url origin", {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (rawRemote) {
      if (rawRemote.startsWith("git@github.com:")) {
        repoUrl = "https://github.com/" + rawRemote.slice("git@github.com:".length).replace(/\.git$/, "");
      } else {
        repoUrl = rawRemote.replace(/\.git$/, "");
      }
    }
  } catch {}
  try {
    gitBranch =
      execSync("git branch --show-current", {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null;
  } catch {}
  return { repoUrl, gitBranch };
}

function readAntigravityWorkspaces(): Set<string> {
  const result = new Set<string>();
  const appData = process.env.APPDATA || "C:\\Users\\Cale\\AppData\\Roaming";
  const dbPath = path.join(appData, "Antigravity IDE", "User", "globalStorage", "state.vscdb");
  if (!fs.existsSync(dbPath)) return result;
  try {
    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    const row = db
      .prepare("SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'")
      .get() as { value?: string } | undefined;
    if (row && row.value) {
      const data = JSON.parse(row.value) as { entries?: Array<{ folderUri?: string }> };
      for (const entry of data.entries ?? []) {
        if (entry.folderUri && entry.folderUri.startsWith("file:///")) {
          let folderPath = decodeURIComponent(entry.folderUri.slice(8));
          if (/^[a-zA-Z]:/.test(folderPath)) {
            folderPath = path.normalize(folderPath);
          }
          result.add(path.resolve(folderPath).toLowerCase());
        }
      }
    }
  } catch {}
  return result;
}

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]!;
}

export function discoverLocalProjects(baseDir?: string): DiscoveredProject[] {
  const rootDir = baseDir || process.env.LOCAL_PROJECTS_DIR || "Y:\\Local Projects";
  const discovered: DiscoveredProject[] = [];
  const antigravityPaths = readAntigravityWorkspaces();

  if (!fs.existsSync(rootDir)) {
    return discovered;
  }

  const categories = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."));

  for (const cat of categories) {
    const catPath = path.join(rootDir, cat.name);
    let subdirs: fs.Dirent[] = [];
    try {
      subdirs = fs
        .readdirSync(catPath, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules" && d.name !== "pkg");
    } catch {
      continue;
    }

    for (const sub of subdirs) {
      const fullPath = path.resolve(catPath, sub.name);
      const pkgDesc = getPackageDescription(fullPath);
      const readmeDesc = getReadmeSummary(fullPath);
      const description = pkgDesc || readmeDesc || `${sub.name} project (${cat.name})`;
      const { repoUrl, gitBranch } = getGitMetadata(fullPath);
      const isAntigravity = antigravityPaths.has(fullPath.toLowerCase());

      discovered.push({
        category: cat.name,
        name: sub.name,
        fullPath,
        description,
        repoUrl,
        gitBranch,
        color: pickColor(sub.name),
        isAntigravityWorkspace: isAntigravity,
      });
    }
  }

  return discovered;
}

export async function scanAndSyncLocalProjects(
  db: Db,
  companyId: string,
  options: { baseDir?: string } = {},
): Promise<LocalProjectScanResult> {
  const localProjects = discoverLocalProjects(options.baseDir);

  const existingProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.companyId, companyId));

  const existingWorkspaces = await db
    .select()
    .from(projectWorkspaces)
    .where(eq(projectWorkspaces.companyId, companyId));

  const projectsByName = new Map<string, typeof projects.$inferSelect>();
  for (const p of existingProjects) {
    projectsByName.set(p.name.toLowerCase(), p);
  }

  const workspacesByProjectId = new Map<string, typeof projectWorkspaces.$inferSelect[]>();
  for (const w of existingWorkspaces) {
    const list = workspacesByProjectId.get(w.projectId) ?? [];
    list.push(w);
    workspacesByProjectId.set(w.projectId, list);
  }

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  const projectSummaries: LocalProjectScanResult["projects"] = [];

  for (const item of localProjects) {
    const existingProject = projectsByName.get(item.name.toLowerCase());
    let projectId: string;
    let isNew = false;

    if (!existingProject) {
      projectId = randomUUID();
      await db.insert(projects).values({
        id: projectId,
        companyId,
        name: item.name,
        description: item.description,
        visibility: "open",
        status: "active",
        color: item.color,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdCount++;
      isNew = true;
    } else {
      projectId = existingProject.id;
      if (!existingProject.description && item.description) {
        await db
          .update(projects)
          .set({ description: item.description, updatedAt: new Date() })
          .where(eq(projects.id, projectId));
      }
    }

    const currentWorkspaces = workspacesByProjectId.get(projectId) ?? [];
    const primaryWs = currentWorkspaces.find((w) => w.isPrimary) ?? currentWorkspaces[0];

    if (!primaryWs) {
      await db.insert(projectWorkspaces).values({
        id: randomUUID(),
        companyId,
        projectId,
        name: item.name,
        sourceType: "local_path",
        cwd: item.fullPath,
        repoUrl: item.repoUrl,
        repoRef: item.gitBranch,
        defaultRef: item.gitBranch,
        visibility: "default",
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (!isNew) updatedCount++;
    } else {
      const needsUpdate = primaryWs.cwd !== item.fullPath || (item.repoUrl && primaryWs.repoUrl !== item.repoUrl);
      if (needsUpdate) {
        await db
          .update(projectWorkspaces)
          .set({
            cwd: item.fullPath,
            repoUrl: item.repoUrl ?? primaryWs.repoUrl,
            repoRef: item.gitBranch ?? primaryWs.repoRef,
            defaultRef: item.gitBranch ?? primaryWs.defaultRef,
            isPrimary: true,
            updatedAt: new Date(),
          })
          .where(eq(projectWorkspaces.id, primaryWs.id));
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    projectSummaries.push({
      name: item.name,
      fullPath: item.fullPath,
      isAntigravity: item.isAntigravityWorkspace,
      isNew,
    });
  }

  return {
    success: true,
    totalDiscovered: localProjects.length,
    createdCount,
    updatedCount,
    unchangedCount,
    projects: projectSummaries,
  };
}
