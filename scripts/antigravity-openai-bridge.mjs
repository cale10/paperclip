#!/usr/bin/env node
/**
 * Antigravity OpenAI-Compatible Local HTTP Bridge
 *
 * Exposes an OpenAI /v1/chat/completions endpoint powered keylessly by the
 * local Google Antigravity language server runtime.
 *
 * Configured Default:
 *   - Primary model:  claude-sonnet-5-5-high
 *   - Fallback model: gemini-3.8-flash-medium
 */

import http from "node:http";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || process.env.BRIDGE_PORT || 8000);
const HOST = process.env.HOST || "127.0.0.1";

const DEFAULT_PRIMARY_MODEL = process.env.PRIMARY_MODEL || "claude-sonnet-5-5-high";
const DEFAULT_FALLBACK_MODEL = process.env.FALLBACK_MODEL || "gemini-3.8-flash-medium";

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

const EXECUTABLE = findExecutable();

function runAgentApi(args) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.GEMINI_API_KEY;
    delete env.GOOGLE_API_KEY;

    const options = {
      timeout: 180000,
      env,
      maxBuffer: 15 * 1024 * 1024,
    };

    execFile(EXECUTABLE, ["agentapi", ...args], options, (error, stdout, stderr) => {
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

async function pollResponse(conversationId, timeoutMs = 120000) {
  const logPath = path.join(
    os.homedir(),
    ".gemini",
    "antigravity",
    "brain",
    conversationId,
    ".system_generated",
    "logs",
    "transcript.jsonl"
  );

  const interval = 800;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(logPath)) {
      try {
        const content = fs.readFileSync(logPath, "utf8");
        const lines = content.trim().split("\n").filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          const step = JSON.parse(lines[i]);
          if (step.type === "PLANNER_RESPONSE" && step.status === "DONE") {
            if (step.content && (!step.tool_calls || step.tool_calls.length === 0)) {
              return {
                content: step.content,
                inputTokens: step.input_tokens || 0,
                outputTokens: step.output_tokens || 0,
              };
            }
          }
        }
      } catch {
        // Retry next poll
      }
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Antigravity response timed out after ${timeoutMs}ms`);
}

function formatMessagesToPrompt(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "";
  }
  if (messages.length === 1 && messages[0].content) {
    return typeof messages[0].content === "string"
      ? messages[0].content
      : JSON.stringify(messages[0].content);
  }

  const sections = [];
  let systemPrompt = "";

  for (const msg of messages) {
    const role = msg.role || "user";
    const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    if (role === "system") {
      systemPrompt += (systemPrompt ? "\n\n" : "") + text;
    } else if (role === "user") {
      sections.push(`Human: ${text}`);
    } else if (role === "assistant") {
      sections.push(`Assistant: ${text}`);
    } else {
      sections.push(`${role.toUpperCase()}: ${text}`);
    }
  }

  let finalPrompt = "";
  if (systemPrompt) {
    finalPrompt += `Instructions:\n${systemPrompt}\n\n`;
  }
  finalPrompt += sections.join("\n\n");
  return finalPrompt;
}

async function executeTurn(modelName, prompt) {
  const result = await runAgentApi([
    "new-conversation",
    `--model=${modelName}`,
    prompt,
  ]);
  const conversationId = result.response?.newConversation?.conversationId;
  if (!conversationId) {
    throw new Error(`Failed to create conversation: ${JSON.stringify(result)}`);
  }
  return await pollResponse(conversationId);
}

async function executeWithFallback(requestedModel, prompt) {
  const primary = requestedModel || DEFAULT_PRIMARY_MODEL;
  const fallback = DEFAULT_FALLBACK_MODEL;

  try {
    console.log(`[bridge] Executing prompt using primary model: ${primary}`);
    const res = await executeTurn(primary, prompt);
    return { ...res, modelUsed: primary, fallbackUsed: false };
  } catch (err) {
    if (primary !== fallback) {
      console.warn(`[bridge:fallback] Primary model ${primary} failed (${err.message}). Falling back to ${fallback}...`);
      try {
        const res = await executeTurn(fallback, prompt);
        return { ...res, modelUsed: fallback, fallbackUsed: true };
      } catch (fallbackErr) {
        throw new Error(`Both primary (${primary}) and fallback (${fallback}) failed. Last error: ${fallbackErr.message}`);
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // Health check
  if (url.pathname === "/" || url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "antigravity-openai-bridge",
        primaryModel: DEFAULT_PRIMARY_MODEL,
        fallbackModel: DEFAULT_FALLBACK_MODEL,
        runtimeExecutable: EXECUTABLE,
      })
    );
    return;
  }

  // Model catalog
  if (url.pathname === "/v1/models" && req.method === "GET") {
    const models = [
      { id: "claude-sonnet-5-5-high", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "claude-sonnet-5-5-medium", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "claude-sonnet-5-5-low", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "claude-opus-5-5-high", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "claude-opus-5-5-medium", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "gemini-4-argon-high", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "gemini-4-argon-medium", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "gemini-3.8-flash-high", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "gemini-3.8-flash-medium", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "gemini-3.8-flash-low", object: "model", created: 1730000000, owned_by: "antigravity" },
      { id: "gpt-oss-120b-medium", object: "model", created: 1730000000, owned_by: "antigravity" },
    ];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ object: "list", data: models }));
    return;
  }

  // Chat completions
  if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
    });

    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyText || "{}");
        const requestedModel = body.model && body.model !== "default" ? body.model : DEFAULT_PRIMARY_MODEL;
        const prompt = formatMessagesToPrompt(body.messages);

        if (!prompt.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Prompt or messages cannot be empty", type: "invalid_request_error" } }));
          return;
        }

        const isStream = Boolean(body.stream);
        const completion = await executeWithFallback(requestedModel, prompt);
        const completionId = `chatcmpl-${randomUUID()}`;
        const createdTime = Math.floor(Date.now() / 1000);

        if (isStream) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });

          const chunk = {
            id: completionId,
            object: "chat.completion.chunk",
            created: createdTime,
            model: completion.modelUsed,
            choices: [
              {
                index: 0,
                delta: { role: "assistant", content: completion.content },
                finish_reason: null,
              },
            ],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);

          const doneChunk = {
            id: completionId,
            object: "chat.completion.chunk",
            created: createdTime,
            model: completion.modelUsed,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          };
          res.write(`data: ${JSON.stringify(doneChunk)}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: completionId,
              object: "chat.completion",
              created: createdTime,
              model: completion.modelUsed,
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: completion.content,
                  },
                  finish_reason: "stop",
                },
              ],
              usage: {
                prompt_tokens: completion.inputTokens || 0,
                completion_tokens: completion.outputTokens || 0,
                total_tokens: (completion.inputTokens || 0) + (completion.outputTokens || 0),
              },
            })
          );
        }
      } catch (err) {
        console.error(`[bridge:error] ${err.stack || err.message}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              message: err.message || "Internal server error",
              type: "server_error",
            },
          })
        );
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message: "Not found", type: "not_found" } }));
});

server.listen(PORT, HOST, () => {
  console.log(`[bridge] Antigravity OpenAI bridge listening on http://${HOST}:${PORT}`);
  console.log(`[bridge] Primary Model:  ${DEFAULT_PRIMARY_MODEL}`);
  console.log(`[bridge] Fallback Model: ${DEFAULT_FALLBACK_MODEL}`);
});
