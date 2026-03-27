import chalk from "chalk";

// ── Branding ────────────────────────────────────────────────────────

export const LOGO = chalk.bold.cyan("SpokeStack");
export const DIM = chalk.dim;
export const BOLD = chalk.bold;
export const SUCCESS = chalk.green;
export const WARNING = chalk.yellow;
export const ERROR_COLOR = chalk.red;
export const INFO = chalk.blue;
export const MUTED = chalk.gray;

// ── Primitives ──────────────────────────────────────────────────────

export function heading(text: string): void {
  console.log();
  console.log(`  ${BOLD(text)}`);
  console.log();
}

export function success(text: string): void {
  console.log(`  ${SUCCESS("\u2714")} ${text}`);
}

export function warn(text: string): void {
  console.log(`  ${WARNING("\u26A0")} ${WARNING(text)}`);
}

export function error(text: string): void {
  console.log(`  ${ERROR_COLOR("\u2716")} ${ERROR_COLOR(text)}`);
}

export function info(text: string): void {
  console.log(`  ${INFO("\u2139")} ${text}`);
}

export function line(text: string): void {
  console.log(`  ${text}`);
}

export function blank(): void {
  console.log();
}

export function divider(): void {
  console.log(`  ${MUTED("\u2500".repeat(60))}`);
}

// ── Tables ──────────────────────────────────────────────────────────

export interface Column {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "right";
  format?: (value: unknown) => string;
}

/**
 * Render a formatted table in the terminal.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function table(columns: Column[], rows: Array<Record<string, any>>): void {
  if (rows.length === 0) {
    line(MUTED("No items to display."));
    return;
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const headerLen = col.label.length;
    const maxDataLen = rows.reduce((max, row) => {
      const val = formatCell(col, row[col.key]);
      return Math.max(max, stripAnsi(val).length);
    }, 0);
    return col.width || Math.max(headerLen, Math.min(maxDataLen, 40));
  });

  // Header row
  const header = columns
    .map((col, i) => pad(BOLD(col.label), widths[i], col.align))
    .join("  ");
  console.log(`  ${header}`);

  // Separator
  const sep = widths.map((w) => MUTED("\u2500".repeat(w))).join("  ");
  console.log(`  ${sep}`);

  // Data rows
  for (const row of rows) {
    const cells = columns
      .map((col, i) => {
        const val = formatCell(col, row[col.key]);
        return pad(val, widths[i], col.align);
      })
      .join("  ");
    console.log(`  ${cells}`);
  }
}

function formatCell(col: Column, value: unknown): string {
  if (col.format) return col.format(value);
  if (value === null || value === undefined) return MUTED("-");
  return String(value);
}

function pad(text: string, width: number, align?: "left" | "right"): string {
  const len = stripAnsi(text).length;
  const diff = width - len;
  if (diff <= 0) return text;
  const padding = " ".repeat(diff);
  return align === "right" ? padding + text : text + padding;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// ── Status Formatters ───────────────────────────────────────────────

const STATUS_COLORS: Record<string, (s: string) => string> = {
  TODO: chalk.white,
  IN_PROGRESS: chalk.cyan,
  DONE: chalk.green,
  ARCHIVED: chalk.gray,
  PLANNING: chalk.yellow,
  ACTIVE: chalk.cyan,
  ON_HOLD: chalk.yellow,
  COMPLETED: chalk.green,
  DRAFT: chalk.white,
  IN_REVIEW: chalk.magenta,
  APPROVED: chalk.green,
  PENDING: chalk.yellow,
  PAID: chalk.green,
  OVERDUE: chalk.red,
  CANCELLED: chalk.gray,
};

export function statusBadge(status: string): string {
  const colorFn = STATUS_COLORS[status] || chalk.white;
  return colorFn(status.replace(/_/g, " "));
}

const PRIORITY_COLORS: Record<string, (s: string) => string> = {
  URGENT: chalk.red.bold,
  HIGH: chalk.red,
  MEDIUM: chalk.yellow,
  LOW: chalk.gray,
};

export function priorityBadge(priority: string): string {
  const colorFn = PRIORITY_COLORS[priority] || chalk.white;
  return colorFn(priority);
}

// ── Date Formatting ─────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return MUTED("-");
  const d = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return MUTED("-");
  const d = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${months[d.getMonth()]} ${d.getDate()} ${h}:${m}`;
}

// ── Currency ────────────────────────────────────────────────────────

export function formatCurrency(cents: number, currency = "USD"): string {
  const amount = (cents / 100).toFixed(2);
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    GBP: "\u00A3",
    AED: "AED ",
  };
  const symbol = symbols[currency] || `${currency} `;
  return `${symbol}${amount}`;
}

// ── Task List (Checklist Style) ─────────────────────────────────────

export function taskList(
  items: Array<{ label: string; done: boolean; detail?: string }>
): void {
  for (const item of items) {
    const icon = item.done ? SUCCESS("\u2714") : MUTED("\u25CB");
    const label = item.done ? MUTED(item.label) : item.label;
    const detail = item.detail ? ` ${MUTED(item.detail)}` : "";
    console.log(`  ${icon} ${label}${detail}`);
  }
}

// ── Upgrade Prompt ──────────────────────────────────────────────────

const TIER_AGENTS: Record<string, { agent: string; capability: string; price: string }> = {
  STARTER: {
    agent: "Projects Agent",
    capability: "project planning, workflow design, and milestone tracking",
    price: "$29/mo",
  },
  PRO: {
    agent: "Briefs Agent",
    capability: "creative brief management, artifact generation, and review workflows",
    price: "$59/mo",
  },
  BUSINESS: {
    agent: "Orders Agent",
    capability: "order processing, invoicing, and customer management",
    price: "$149/mo",
  },
};

export function upgradePrompt(requiredTier: string, currentTier?: string): void {
  const tierInfo = TIER_AGENTS[requiredTier];
  if (!tierInfo) {
    warn(`This feature requires the ${requiredTier} plan.`);
    blank();
    line(`  ${MUTED("\u2192")} Upgrade now: ${BOLD("spokestack upgrade")}`);
    line(`  ${MUTED("\u2192")} Learn more: ${MUTED("spokestack.dev/pricing")}`);
    blank();
    return;
  }

  blank();
  warn(`This requires the ${requiredTier.charAt(0) + requiredTier.slice(1).toLowerCase()} plan (${tierInfo.price})`);
  if (currentTier) {
    line(`  Your current plan: ${BOLD(currentTier)}`);
  }
  blank();
  line(`  Your ${BOLD(tierInfo.agent)} is ready to help with ${tierInfo.capability}.`);
  blank();
  line(`  ${MUTED("\u2192")} Upgrade now: ${BOLD("spokestack upgrade")}`);
  line(`  ${MUTED("\u2192")} Learn more: ${MUTED("spokestack.dev/pricing")}`);
  blank();
}

// ── Spinner ─────────────────────────────────────────────────────────

const SPINNER_FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];

export function spinner(message: string): { stop: (finalMessage?: string) => void } {
  let i = 0;
  const interval = setInterval(() => {
    const frame = SPINNER_FRAMES[i % SPINNER_FRAMES.length];
    process.stdout.write(`\r  ${chalk.cyan(frame)} ${message}`);
    i++;
  }, 80);

  return {
    stop(finalMessage?: string) {
      clearInterval(interval);
      process.stdout.write("\r" + " ".repeat(message.length + 10) + "\r");
      if (finalMessage) {
        success(finalMessage);
      }
    },
  };
}

// ── JSON Output ─────────────────────────────────────────────────────

export function jsonOutput(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ── Minimal Output (tab-separated, for piping) ─────────────────────

export function minimalOutput(rows: string[][]): void {
  for (const row of rows) {
    console.log(`  ${row.join("\t")}`);
  }
}

// ── Agent Chat Formatting ───────────────────────────────────────────

export function agentMessage(agent: string, text: string): void {
  blank();
  console.log(`  ${chalk.cyan.bold(agent + ":")} ${text}`);
}

export function userPrompt(): string {
  return `  ${chalk.bold("You:")} `;
}

export function agentStreaming(agent: string): void {
  process.stdout.write(`\n  ${chalk.cyan.bold(agent + ":")} `);
}

export function agentStreamChunk(text: string): void {
  process.stdout.write(text);
}

export function agentStreamEnd(): void {
  console.log();
}

// ── Welcome Banner ──────────────────────────────────────────────────

export function welcomeBanner(orgName?: string): void {
  blank();
  console.log(`  ${LOGO} ${MUTED("v0.1.0")}`);
  if (orgName) {
    console.log(`  ${MUTED("Workspace:")} ${BOLD(orgName)}`);
  }
  divider();
  blank();
}

// ── Handle API Response ─────────────────────────────────────────────

export function handleError(apiError: string | undefined, upgradeRequired?: boolean, requiredTier?: string): boolean {
  if (!apiError) return false;

  if (upgradeRequired && requiredTier) {
    upgradePrompt(requiredTier);
    return true;
  }

  error(apiError);
  return true;
}
