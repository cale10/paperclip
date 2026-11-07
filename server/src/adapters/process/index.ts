import type { ServerAdapterModule } from "../types.js";
import type { AdapterConfigSchema } from "@paperclipai/adapter-utils";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export function getConfigSchema(): AdapterConfigSchema {
  return {
    fields: [
      {
        key: "command",
        label: "Command",
        type: "text",
        hint: "Command to execute (e.g. node, python, or executable path)",
      },
      {
        key: "args",
        label: "Arguments",
        type: "text",
        hint: "Arguments to pass to the command",
      },
      {
        key: "cwd",
        label: "Working directory",
        type: "text",
        hint: "Working directory for the process",
      },
    ],
  };
}

export const processAdapter: ServerAdapterModule = {
  type: "process",
  runtimeToolDelivery: "environment",
  execute,
  testEnvironment,
  getConfigSchema,
  models: [],
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: `# process agent configuration

Adapter: process

Core fields:
- command (string, required): command to execute
- args (string[] | string, optional): command arguments
- cwd (string, optional): absolute working directory
- env (object, optional): KEY=VALUE environment variables

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds
`,
};
