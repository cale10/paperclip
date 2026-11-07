#!/usr/bin/env node
/**
 * Antigravity SDK Agent Runner for Paperclip
 *
 * Invokes the local Google Antigravity runtime (language_server.exe agentapi)
 * keyless without requiring any Google or Gemini API keys.
 * Pattern modeled after RPM Life Navigator AI Assistant.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MAX_CLI_PROMPT_CHARS = 6000;

const CANDIDATE_EXECUTABLES = [
  process.env.ANTIGRAVITY_BIN,
  process.env.ANTIGRAVITY_AGENTAPI_EXE,
  "C:\\Users\\Cale\\AppData\\Local\\Programs\\antigravity\\resources\\bin\\language_server.exe",
  "Y:\\Coding Programs\\antigravity\\resources\\bin\\language_server.exe",
  path.join(os.homedir(), ".gemini", "antigravity-ide", "bin", "language_server.exe"),
  path.join(os.homedir(), ".gemini", "bin", "language_server.exe"),
].filter(Boolean);

function findExecutable() {
  for (const bin of CANDIDATE_EXECUTABLES) {
    if (fs.existsSync(bin)) return bin;
  }
  return "language_server.exe";
}

function runAgentApi(executable, args) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.GEMINI_API_KEY;
    delete env.GOOGLE_API_KEY;

    const options = {
      timeout: 120000,
      env,
      maxBuffer: 10 * 1024 * 1024,
    };

    execFile(executable, ["agentapi", ...args], options, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`agentapi error: ${error.message} (stdout: ${stdout}, stderr: ${stderr})`));
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed && parsed.error) {
          return reject(new Error(`agentapi returned error: ${parsed.error}`));
        }
        resolve(parsed);
      } catch {
        reject(new Error(`Failed to parse agentapi output as JSON: ${stdout}`));
      }
    });
  });
}

function getLastStepIndex(conversationId) {
  const logPath = path.join(
    os.homedir(),
    ".gemini",
    "antigravity",
    "brain",
    conversationId,
    ".system_generated",
    "logs",
    "transcript.jsonl",
  );
  if (!fs.existsSync(logPath)) return -1;
  try {
    const content = fs.readFileSync(logPath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);
    let maxIndex = -1;
    for (const line of lines) {
      const step = JSON.parse(line);
      if (typeof step.step_index === "number" && step.step_index > maxIndex) {
        maxIndex = step.step_index;
      }
    }
    return maxIndex;
  } catch {
    return -1;
  }
}

async function pollResponse(conversationId, lastStepIndex = -1) {
  const logPath = path.join(
    os.homedir(),
    ".gemini",
    "antigravity",
    "brain",
    conversationId,
    ".system_generated",
    "logs",
    "transcript.jsonl",
  );
  const timeout = Number(process.env.PAPERCLIP_AGENT_TIMEOUT_MS) || 300000;
  const interval = 1200;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (fs.existsSync(logPath)) {
      try {
        const content = fs.readFileSync(logPath, "utf8");
        const lines = content.trim().split("\n").filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          const step = JSON.parse(lines[i]);
          if (step.type === "PLANNER_RESPONSE" && step.step_index > lastStepIndex) {
            if (step.content && step.status === "DONE" && (!step.tool_calls || step.tool_calls.length === 0)) {
              return step.content;
            }
          }
        }
      } catch {
        // Retry on read error
      }
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Antigravity model response timed out.");
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data.trim()));
    setTimeout(() => resolve(data.trim()), 500);
  });
}

function resolveSessionFile() {
  const agentId = process.env.PAPERCLIP_AGENT_ID;
  const taskId = process.env.PAPERCLIP_TASK_ID;
  if (agentId && taskId) {
    return path.resolve(process.cwd(), `.antigravity_session_${agentId}_${taskId}`);
  }
  if (agentId) {
    return path.resolve(process.cwd(), `.antigravity_session_${agentId}`);
  }
  return path.resolve(process.cwd(), ".antigravity_session");
}

function readSessionState(sessionFile) {
  if (!fs.existsSync(sessionFile)) return null;
  try {
    const raw = fs.readFileSync(sessionFile, "utf8").trim();
    if (!raw) return null;
    if (raw.startsWith("{")) {
      return JSON.parse(raw);
    }
    // Backward compatibility: old session files stored raw conversationId
    return { conversationId: raw, tier: "flash" };
  } catch {
    return null;
  }
}

function writeSessionState(sessionFile, state) {
  try {
    fs.writeFileSync(sessionFile, JSON.stringify(state, null, 2), "utf8");
  } catch {}
}

/**
 * ============================================================================
 * Decision Engine for Antigravity AI Model & Thinking Effort Selection.
 * ============================================================================
 *
 * Full Knowledge Catalog of Choices & Rationale:
 * 
 * 1. PRO (Tier: "pro")
 *    - Backed by: Gemini 4 Argon (High/Medium), Claude Opus 5.5 (High/Medium)
 *    - Reasoning Effort: high, xhigh, max
 *    - When & Why to Choose:
 *      * Strategic Planning & Roadmaps: Long-horizon company objectives, vendor strategies (e.g. Eli Lilly MSAs), OKRs.
 *      * Executive / CEO Decision Making: Organizational structure, agent hiring/delegation, policy formation.
 *      * High-Impact Architecture & Schema Migrations: Redesigning system boundaries, breaking database changes, multi-package contracts.
 *      * Root Cause Analysis & Deep Debugging: Investigating persistent or transient run failures, memory leaks, race conditions.
 *      * First Issue Inception: Initial task scoping and project initialization.
 *
 * 2. FLASH (Tier: "flash")
 *    - Backed by: Gemini 3.8 Flash (High/Medium), Claude Sonnet 5.5 (High/Medium)
 *    - Reasoning Effort: medium, high
 *    - When & Why to Choose:
 *      * Day-to-Day Software Engineering: Writing features, unit testing, bugfixes, UI component adjustments.
 *      * Issue Conversations & Team Communications: Responding to user/agent comments, status reports, PR feedback.
 *      * Active Task Continuation: Subsequent implementation turns where the plan is already defined.
 *
 * 3. FLASH LITE (Tier: "flash_lite")
 *    - Backed by: Gemini 3.8 Flash (Low), Gemini 3.5 Flash Lite
 *    - Reasoning Effort: low
 *    - When & Why to Choose:
 *      * Idle Heartbeat Polling: Periodic background checks when no actionable task is assigned.
 *      * Queue & Inbox Health Checks: Lightweight checks to confirm inbox state.
 *      * Fast Formatting, Documentation & Lint Cleanup: Routine typos, docstrings, formatting tweaks.
 */
function resolveSmartModelAndEffort(context) {
  const {
    rawPrompt = "",
    wakeReason = "",
    agentRole = "",
    agentName = "",
    configModel = "auto",
    configEffort = "",
    taskId = "",
    conversationMode = false,
  } = context;

  // 1. Explicit Model Configuration Override
  const cleanModel = (configModel || "").trim().toLowerCase();
  if (cleanModel && cleanModel !== "auto") {
    if (/claude-sonnet/.test(cleanModel)) {
      return {
        tier: "claude-sonnet-5-5-high",
        modelName: "Claude Sonnet 5.5 (High)",
        effort: configEffort || "high",
        reason: `Explicit Claude Sonnet 5.5 configuration in Paperclip agent settings (${configModel})`,
      };
    }
    if (/claude-opus/.test(cleanModel)) {
      return {
        tier: "claude-opus-5-5-high",
        modelName: "Claude Opus 5.5 (High)",
        effort: configEffort || "high",
        reason: `Explicit Claude Opus 5.5 configuration in Paperclip agent settings (${configModel})`,
      };
    }
    if (/^(pro|gemini-4|gemini-2\.5-pro|gemini-3\.1-pro)/.test(cleanModel)) {
      return {
        tier: "gemini-4-argon-high",
        modelName: "Gemini 4 Argon (High)",
        effort: configEffort || "high",
        reason: `Explicit model configuration in Paperclip agent settings (${configModel})`,
      };
    }
    if (/^(flash_lite|flash-lite|gemini-2\.5-flash-lite|gemini-3\.5-flash-lite)/.test(cleanModel)) {
      return {
        tier: "gemini-3.8-flash-low",
        modelName: "Gemini 3.8 Flash (Low)",
        effort: configEffort || "low",
        reason: `Explicit lightweight model configuration in Paperclip agent settings (${configModel})`,
      };
    }
    if (/^(flash|gemini-3\.8-flash)/.test(cleanModel)) {
      return {
        tier: "gemini-3.8-flash-medium",
        modelName: "Gemini 3.8 Flash (Medium)",
        effort: configEffort || "medium",
        reason: `Explicit model configuration in Paperclip agent settings (${configModel})`,
      };
    }
    return {
      tier: cleanModel,
      modelName: configModel,
      effort: configEffort || "medium",
      reason: `Direct model identifier in Paperclip agent settings (${configModel})`,
    };
  }

  // 2. Auto-Routing Decision Matrix
  const promptLower = rawPrompt.toLowerCase();
  const isExecutiveRole = /ceo|executive|strategist|architect|director|manager/i.test(`${agentRole} ${agentName}`);

  // Rule 1: Transient Failure Retry -> Escalate to Pro for deeper analysis and high reliability
  if (wakeReason === "transient_failure_retry" || promptLower.includes("transient_failure_retry")) {
    return {
      tier: "pro",
      modelName: "Gemini 4 Argon / Pro",
      effort: "high",
      reason: "Transient failure recovery run. Escalated to Pro tier for maximum resilience and deep root-cause diagnosis.",
    };
  }

  // Rule 2: Idle Heartbeat Timer (no active issue or prompt indicates no pending work)
  const isHeartbeatTimer = wakeReason === "heartbeat_timer" || wakeReason === "timer";
  const hasNoActiveTask = !taskId || taskId.trim().length === 0;
  if (isHeartbeatTimer && hasNoActiveTask) {
    return {
      tier: "flash_lite",
      modelName: "Gemini 3.8 Flash (Low) / Flash Lite",
      effort: "low",
      reason: "Routine background heartbeat with no active task assignment. Using Flash Lite to minimize latency and resource consumption.",
    };
  }

  // Rule 3: Strategic Planning, Architecture, Governance & Executive Directives
  const strategicKeywords = [
    "strategic", "strategy", "roadmap", "milestone", "architecture",
    "hire", "hiring", "contract", "licensing", "procurement", "vendor",
    "okr", "rfc", "design doc", "system design", "governance", "budget",
    "onboarding", "spec-implementation", "master services agreement", "msa"
  ];
  const hasStrategicIntent = strategicKeywords.some((kw) => promptLower.includes(kw));

  if (isExecutiveRole && (hasStrategicIntent || wakeReason === "on_demand" || wakeReason === "assignment" || wakeReason === "manual")) {
    return {
      tier: "pro",
      modelName: "Gemini 4 Argon / Pro",
      effort: "high",
      reason: `Strategic planning, architecture, or governance detected for executive agent (${agentName || agentRole || "CEO"}). Routed to Pro tier for deep multi-step deliberation.`,
    };
  }

  if (hasStrategicIntent) {
    return {
      tier: "pro",
      modelName: "Gemini 4 Argon / Pro",
      effort: "high",
      reason: "Strategic architecture, contract, or design document keywords detected. Routed to Pro tier for high-depth planning.",
    };
  }

  // Rule 4: Cryptic Debugging, Security or Complex Refactoring
  const deepAnalysisKeywords = [
    "root cause", "rca", "investigate failure", "deadlock", "race condition",
    "memory leak", "security advisory", "vulnerability", "breaking change",
    "complex refactor", "schema migration"
  ];
  const hasDeepAnalysisIntent = deepAnalysisKeywords.some((kw) => promptLower.includes(kw));
  if (hasDeepAnalysisIntent) {
    return {
      tier: "pro",
      modelName: "Gemini 4 Argon / Pro",
      effort: "high",
      reason: "Complex refactoring or deep root-cause debugging detected. Routed to Pro tier for exhaustive reasoning.",
    };
  }

  // Rule 5: Interactive Conversation / Issue Q&A
  if (conversationMode || promptLower.includes("conversation") || promptLower.includes("wakecommentid")) {
    return {
      tier: "flash",
      modelName: "Gemini 3.8 Flash",
      effort: "medium",
      reason: "Issue conversation or team interaction detected. Routed to Flash for rapid conversational response.",
    };
  }

  // Rule 6: Default Active Implementation & Feature Coding
  return {
    tier: "flash",
    modelName: "Gemini 3.8 Flash",
    effort: "medium",
    reason: "Standard feature development, coding implementation, or task execution. Routed to Flash tier for optimal velocity and accuracy.",
  };
}

/**
 * Windows CreateProcessW limits command-line arguments to 32,767 characters.
 * When a Paperclip prompt exceeds MAX_CLI_PROMPT_CHARS, write the full prompt
 * to a file on disk and pass a compact CLI message referencing that file plus
 * the runtime credentials and latest wake instructions.
 */
function prepareCliSafePrompt(rawPrompt) {
  if (rawPrompt.length <= MAX_CLI_PROMPT_CHARS) {
    return rawPrompt;
  }

  const runId = process.env.PAPERCLIP_RUN_ID || "latest";
  const promptDir = path.resolve(process.cwd(), ".antigravity_prompts");
  fs.mkdirSync(promptDir, { recursive: true });
  const promptFile = path.join(promptDir, `prompt_${runId}.md`);
  fs.writeFileSync(promptFile, rawPrompt, "utf8");

  const envHeader = [
    `PAPERCLIP_AGENT_ID=${process.env.PAPERCLIP_AGENT_ID || ""}`,
    `PAPERCLIP_COMPANY_ID=${process.env.PAPERCLIP_COMPANY_ID || ""}`,
    `PAPERCLIP_RUN_ID=${process.env.PAPERCLIP_RUN_ID || ""}`,
    `PAPERCLIP_API_URL=${process.env.PAPERCLIP_API_URL || "http://localhost:3100"}`,
    `PAPERCLIP_API_KEY=${process.env.PAPERCLIP_API_KEY || ""}`,
    `PAPERCLIP_TASK_ID=${process.env.PAPERCLIP_TASK_ID || ""}`,
    `PAPERCLIP_WAKE_REASON=${process.env.PAPERCLIP_WAKE_REASON || ""}`,
    `PAPERCLIP_WAKE_COMMENT_ID=${process.env.PAPERCLIP_WAKE_COMMENT_ID || ""}`,
  ].join("\n");

  const head = rawPrompt.slice(0, 1500);
  const tail = rawPrompt.slice(-3000);

  return [
    `IMPORTANT: The full Paperclip prompt (${rawPrompt.length} chars) has been saved to disk at:`,
    `${promptFile}`,
    `Read "${promptFile}" using read_file if you need any section omitted below.`,
    ``,
    `--- PAPERCLIP RUNTIME ENV ---`,
    envHeader,
    ``,
    `--- PROMPT START (first 1500 chars) ---`,
    head,
    ``,
    `...[middle omitted; see ${promptFile}]...`,
    ``,
    `--- PROMPT END (last 3000 chars) ---`,
    tail,
  ].join("\n");
}

async function main() {
  const executable = findExecutable();
  if (!fs.existsSync(executable)) {
    console.error(`Antigravity binary not found. Checked: ${CANDIDATE_EXECUTABLES.join(", ")}`);
    process.exit(1);
  }

  const stdinPrompt = await readStdin();
  const cliArgs = process.argv.slice(2);
  let prompt = stdinPrompt || cliArgs.join(" ");
  if (!prompt) {
    if (process.env.PAPERCLIP_AGENT_ID) {
      prompt = `Paperclip agent heartbeat wakeup.
Agent ID: ${process.env.PAPERCLIP_AGENT_ID}
Company ID: ${process.env.PAPERCLIP_COMPANY_ID || ""}
Run ID: ${process.env.PAPERCLIP_RUN_ID || ""}
API URL: ${process.env.PAPERCLIP_API_URL || "http://localhost:3100"}
Wake Reason: ${process.env.PAPERCLIP_WAKE_REASON || "heartbeat_timer"}
Task ID: ${process.env.PAPERCLIP_TASK_ID || ""}
Wake Comment ID: ${process.env.PAPERCLIP_WAKE_COMMENT_ID || ""}

Follow the Paperclip skill heartbeat procedure: check identity, inbox, and pick the highest priority actionable work.`;
    } else {
      prompt = "Paperclip agent heartbeat check.";
    }
  }

  const safePrompt = prepareCliSafePrompt(prompt);

  const decision = resolveSmartModelAndEffort({
    rawPrompt: prompt,
    wakeReason: process.env.PAPERCLIP_WAKE_REASON || "",
    agentRole: process.env.PAPERCLIP_AGENT_ROLE || "",
    agentName: process.env.PAPERCLIP_AGENT_NAME || "",
    configModel: process.env.PAPERCLIP_CONFIG_MODEL || process.env.ANTIGRAVITY_MODEL || "auto",
    configEffort: process.env.PAPERCLIP_CONFIG_EFFORT || "",
    taskId: process.env.PAPERCLIP_TASK_ID || "",
    conversationMode: process.env.PAPERCLIP_CONVERSATION_MODE === "true",
  });

  console.error(`[paperclip:model-router] Auto-route decision: ${decision.modelName} (tier: ${decision.tier}, effort: ${decision.effort})`);
  console.error(`[paperclip:model-router] Selection rationale: ${decision.reason}`);
  console.error(`[paperclip:model-router:attribution] model=${decision.tier}`);

  const convoFile = resolveSessionFile();
  const sessionState = readSessionState(convoFile);
  let conversationId = sessionState?.conversationId || null;

  // If existing session was created with a different tier, rotate to fresh conversation
  if (sessionState && sessionState.tier && sessionState.tier !== decision.tier) {
    console.error(
      `[paperclip:model-router] Session tier changed (${sessionState.tier} -> ${decision.tier}). Starting fresh session for new tier.`
    );
    conversationId = null;
  }

  let lastStep = -1;
  if (conversationId) {
    lastStep = getLastStepIndex(conversationId);
    if (lastStep === -1) {
      conversationId = null;
    }
  }

  if (conversationId) {
    try {
      await runAgentApi(executable, ["send-message", conversationId, safePrompt]);
    } catch {
      conversationId = null;
      lastStep = -1;
    }
  }

  if (!conversationId) {
    let result;
    try {
      result = await runAgentApi(executable, [
        "new-conversation",
        `--model=${decision.tier}`,
        safePrompt,
      ]);
    } catch (err) {
      if (decision.tier !== "gemini-3.8-flash-medium" && decision.tier !== "flash") {
        console.warn(`[paperclip:model-router] Model ${decision.tier} failed (${err.message}). Falling back to gemini-3.8-flash-medium...`);
        result = await runAgentApi(executable, [
          "new-conversation",
          "--model=gemini-3.8-flash-medium",
          safePrompt,
        ]);
        decision.tier = "gemini-3.8-flash-medium";
        decision.modelName = "Gemini 3.8 Flash (Medium)";
      } else {
        throw err;
      }
    }
    conversationId = result.response?.newConversation?.conversationId;
    if (!conversationId) {
      throw new Error(`Failed to create conversation: ${JSON.stringify(result)}`);
    }
    writeSessionState(convoFile, {
      conversationId,
      tier: decision.tier,
      modelName: decision.modelName,
      effort: decision.effort,
      taskId: process.env.PAPERCLIP_TASK_ID || null,
      updatedAt: new Date().toISOString(),
    });
  }

  const responseText = await pollResponse(conversationId, lastStep);
  if (responseText) {
    if (process.env.PAPERCLIP_TASK_ID && process.env.PAPERCLIP_API_URL && process.env.PAPERCLIP_API_KEY) {
      try {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PAPERCLIP_API_KEY}`,
          ...(process.env.PAPERCLIP_RUN_ID ? { "X-Paperclip-Run-Id": process.env.PAPERCLIP_RUN_ID } : {}),
        };
        let alreadyCommented = false;
        if (process.env.PAPERCLIP_RUN_ID) {
          const existingRes = await fetch(
            `${process.env.PAPERCLIP_API_URL}/api/issues/${process.env.PAPERCLIP_TASK_ID}/comments`,
            { headers },
          );
          if (existingRes.ok) {
            const comments = await existingRes.json();
            if (Array.isArray(comments) && comments.some((c) => c.createdByRunId === process.env.PAPERCLIP_RUN_ID)) {
              alreadyCommented = true;
            }
          }
        }
        if (!alreadyCommented) {
          await fetch(`${process.env.PAPERCLIP_API_URL}/api/issues/${process.env.PAPERCLIP_TASK_ID}/comments`, {
            method: "POST",
            headers,
            body: JSON.stringify({ body: responseText }),
          });
        }
      } catch {
        // Non-fatal if comment creation is handled upstream
      }
    }
  }
  process.stdout.write(responseText + "\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(`[antigravity-agent-runner] Error: ${err.message}`);
  process.exit(1);
});
