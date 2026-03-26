import { Command } from "commander";
import * as readline from "node:readline";
import { post, streamRequest } from "../api.js";
import { loadAuth } from "../auth.js";
import * as ui from "../ui.js";

export function registerAgentCommand(program: Command): void {
  const agent = program
    .command("agent")
    .description("Interact with SpokeStack agents");

  // ── agent chat ────────────────────────────────────────────────────

  agent
    .command("chat")
    .description("Open an interactive agent conversation")
    .option("--agent <type>", "Agent type (tasks, projects, briefs, orders)", "tasks")
    .action(async (opts) => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` first.");
        process.exit(1);
      }

      const agentNames: Record<string, string> = {
        tasks: "Tasks Agent",
        projects: "Projects Agent",
        briefs: "Briefs Agent",
        orders: "Orders Agent",
      };

      let currentAgent = opts.agent.toLowerCase();
      let agentName = agentNames[currentAgent] || "Tasks Agent";
      let sessionId: string | undefined;

      ui.blank();
      ui.line(`  Connected to ${ui.BOLD(agentName)} for ${ui.BOLD(auth.orgSlug)}`);
      ui.line(`  Type a message, or ${ui.MUTED("/help")} for commands`);
      ui.blank();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: ui.userPrompt(),
      });

      rl.prompt();

      rl.on("line", async (input) => {
        const trimmed = input.trim();

        if (!trimmed) {
          rl.prompt();
          return;
        }

        // Handle slash commands
        if (trimmed.startsWith("/")) {
          const handled = handleSlashCommand(trimmed, rl, () => {
            return { currentAgent, agentName };
          }, (newAgent: string, newName: string) => {
            currentAgent = newAgent;
            agentName = newName;
          });

          if (handled === "quit") {
            rl.close();
            return;
          }

          rl.prompt();
          return;
        }

        // Send message to agent via SSE
        try {
          const res = await streamRequest("/api/v1/agents/chat", {
            message: trimmed,
            sessionId,
            surface: "CLI",
            agentType: currentAgent,
          });

          if (!res.ok) {
            if (res.upgradeRequired) {
              ui.upgradePrompt(res.requiredTier || "STARTER");
            } else {
              ui.error(res.error || "Agent unavailable.");
            }
            rl.prompt();
            return;
          }

          // Parse SSE stream
          const response = res.data as Response;
          await parseSSEStream(response, agentName, (newSessionId) => {
            sessionId = newSessionId;
          });
        } catch (err) {
          ui.error("Connection error. The agent may be temporarily unavailable.");
        }

        rl.prompt();
      });

      rl.on("close", () => {
        ui.blank();
        ui.info("Chat session ended.");
        ui.blank();
        process.exit(0);
      });
    });

  // ── agent ask ─────────────────────────────────────────────────────

  agent
    .command("ask <message>")
    .description("One-shot agent query")
    .action(async (message: string) => {
      const s = ui.spinner("Thinking...");
      const res = await post<{
        response: string;
        agentType: string;
        actions?: Array<{ type: string; description: string }>;
      }>("/api/v1/agents/ask", {
        message,
        surface: "CLI",
      });
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const data = res.data;
      const agentLabel = data.agentType
        ? `${data.agentType.charAt(0).toUpperCase() + data.agentType.slice(1)} Agent`
        : "Agent";

      ui.agentMessage(agentLabel, data.response);

      if (data.actions && data.actions.length > 0) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Actions taken:")}`);
        for (const action of data.actions) {
          ui.line(`    ${ui.SUCCESS("\u2714")} ${action.description}`);
        }
      }

      ui.blank();
    });
}

// ── Slash Commands ──────────────────────────────────────────────────

function handleSlashCommand(
  input: string,
  rl: readline.Interface,
  getState: () => { currentAgent: string; agentName: string },
  setState: (agent: string, name: string) => void
): "quit" | "handled" {
  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  const agentNames: Record<string, string> = {
    tasks: "Tasks Agent",
    projects: "Projects Agent",
    briefs: "Briefs Agent",
    orders: "Orders Agent",
  };

  switch (cmd) {
    case "/quit":
    case "/exit":
    case "/q":
      return "quit";

    case "/help":
      ui.blank();
      ui.line(`  ${ui.BOLD("Chat Commands:")}`);
      ui.line(`    ${ui.BOLD("/help")}              Show this help`);
      ui.line(`    ${ui.BOLD("/switch <agent>")}    Switch agent (tasks, projects, briefs, orders)`);
      ui.line(`    ${ui.BOLD("/status")}            Quick workspace status`);
      ui.line(`    ${ui.BOLD("/surface")}           Show available agents on your tier`);
      ui.line(`    ${ui.BOLD("/quit")}              End chat session`);
      ui.blank();
      return "handled";

    case "/switch": {
      const target = parts[1]?.toLowerCase();
      if (!target || !agentNames[target]) {
        ui.warn("Usage: /switch <tasks|projects|briefs|orders>");
        return "handled";
      }
      setState(target, agentNames[target]);
      ui.blank();
      ui.info(`Switched to ${ui.BOLD(agentNames[target])}`);
      ui.blank();
      return "handled";
    }

    case "/status":
      ui.blank();
      ui.info("Fetching workspace status...");
      // Fire and forget — the response will print before next prompt
      (async () => {
        const { post: apiPost } = await import("../api.js");
        const res = await apiPost<{ status: string }>("/api/v1/agents/ask", {
          message: "Give me a quick workspace status update.",
          surface: "CLI",
        });
        if (res.ok) {
          const state = getState();
          ui.agentMessage(state.agentName, (res.data as { response: string }).response);
        }
        rl.prompt();
      })();
      return "handled";

    case "/surface":
      ui.blank();
      ui.line(`  ${ui.BOLD("Available Agents:")}`);
      ui.line(`    ${ui.SUCCESS("\u2714")} Tasks Agent ${ui.MUTED("(Free)")}`);
      ui.line(`    ${ui.MUTED("\u25CB")} Projects Agent ${ui.MUTED("(Starter $29/mo)")}`);
      ui.line(`    ${ui.MUTED("\u25CB")} Briefs Agent ${ui.MUTED("(Pro $59/mo)")}`);
      ui.line(`    ${ui.MUTED("\u25CB")} Orders Agent ${ui.MUTED("(Business $149/mo)")}`);
      ui.blank();
      ui.line(`  Run ${ui.BOLD("spokestack upgrade")} to unlock more agents.`);
      ui.blank();
      return "handled";

    default:
      ui.warn(`Unknown command: ${cmd}. Type /help for available commands.`);
      return "handled";
  }
}

// ── SSE Stream Parser ───────────────────────────────────────────────

async function parseSSEStream(
  response: Response,
  agentName: string,
  onSessionId: (id: string) => void
): Promise<void> {
  if (!response.body) {
    ui.error("No response stream received.");
    return;
  }

  ui.agentStreaming(agentName);

  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          handleSSEEvent(eventType, data, agentName, onSessionId);
          eventType = "";
        }
      }
    }
  } catch {
    // Stream ended or connection lost
  }

  ui.agentStreamEnd();
}

function handleSSEEvent(
  eventType: string,
  data: string,
  _agentName: string,
  onSessionId: (id: string) => void
): void {
  try {
    switch (eventType) {
      case "token":
      case "": {
        // Stream text tokens
        const parsed = JSON.parse(data);
        if (parsed.token) {
          ui.agentStreamChunk(parsed.token);
        } else if (typeof parsed === "string") {
          ui.agentStreamChunk(parsed);
        }
        break;
      }

      case "session": {
        const parsed = JSON.parse(data);
        if (parsed.sessionId) {
          onSessionId(parsed.sessionId);
        }
        break;
      }

      case "action": {
        const parsed = JSON.parse(data);
        if (parsed.description) {
          ui.agentStreamEnd();
          ui.line(`    ${ui.SUCCESS("\u2714")} ${parsed.description}`);
          ui.agentStreaming("");
        }
        break;
      }

      case "error": {
        const parsed = JSON.parse(data);
        ui.agentStreamEnd();
        ui.error(parsed.message || "Agent error.");
        break;
      }

      case "done":
        // Stream complete
        break;
    }
  } catch {
    // If data is plain text, render it directly
    if (data && eventType !== "done") {
      ui.agentStreamChunk(data);
    }
  }
}
