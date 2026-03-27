import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  orgId: string;
  orgSlug: string;
  email?: string;
  userName?: string;
}

const SPOKESTACK_DIR = path.join(os.homedir(), ".spokestack");
const AUTH_FILE = path.join(SPOKESTACK_DIR, "auth.json");
const CONFIG_FILE = path.join(SPOKESTACK_DIR, "config.json");

function ensureDir(): void {
  if (!fs.existsSync(SPOKESTACK_DIR)) {
    fs.mkdirSync(SPOKESTACK_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load stored auth credentials from ~/.spokestack/auth.json.
 * Returns null if not logged in or file is missing/corrupt.
 */
export function loadAuth(): AuthData | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    const raw = fs.readFileSync(AUTH_FILE, "utf-8");
    const data = JSON.parse(raw) as AuthData;
    if (!data.accessToken || !data.refreshToken) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Persist auth credentials to ~/.spokestack/auth.json.
 */
export function saveAuth(auth: AuthData): void {
  ensureDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

/**
 * Clear stored auth credentials (logout).
 */
export function clearAuth(): void {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      fs.unlinkSync(AUTH_FILE);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Check whether the access token has expired or is about to (30s buffer).
 */
export function isTokenExpired(auth: AuthData): boolean {
  return Date.now() >= auth.expiresAt - 30_000;
}

/**
 * Load and return a valid auth, refreshing the token if expired.
 * Returns null if no auth is stored or refresh fails.
 */
export async function getValidAuth(): Promise<AuthData | null> {
  const auth = loadAuth();
  if (!auth) return null;

  if (!isTokenExpired(auth)) return auth;

  // Attempt token refresh
  const refreshed = await refreshToken(auth);
  if (refreshed) {
    saveAuth(refreshed);
    return refreshed;
  }

  return null;
}

/**
 * Refresh an expired access token using the refresh token.
 */
async function refreshToken(auth: AuthData): Promise<AuthData | null> {
  try {
    const { apiBase } = getConfig();
    const res = await fetch(`${apiBase}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };

    return {
      ...auth,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Prompt the user to log in. Returns a message directing them to run `spokestack login`.
 */
export function promptLogin(): string {
  return "Not logged in. Run `spokestack login` or `spokestack init` to get started.";
}

export interface CLIConfig {
  apiBase: string;
  defaultFormat: "table" | "json" | "minimal";
  colorOutput: boolean;
}

/**
 * Load CLI config from ~/.spokestack/config.json, with defaults.
 */
export function getConfig(): CLIConfig {
  const defaults: CLIConfig = {
    apiBase: process.env.SPOKESTACK_API_URL || "https://app.spokestack.dev",
    defaultFormat: "table",
    colorOutput: true,
  };

  try {
    if (!fs.existsSync(CONFIG_FILE)) return defaults;
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const stored = JSON.parse(raw);
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}

/**
 * Save CLI config to ~/.spokestack/config.json.
 */
export function saveConfig(config: Partial<CLIConfig>): void {
  ensureDir();
  const existing = getConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}
