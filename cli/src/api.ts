import { getValidAuth, getConfig, promptLogin, type AuthData } from "./auth.js";

export interface APIResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
  upgradeRequired?: boolean;
  requiredTier?: string;
  message?: string;
}

/**
 * Core HTTP client for SpokeStack API. Handles auth headers, token refresh,
 * upgrade-required responses, and error formatting.
 */
export async function apiRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  options?: { stream?: boolean }
): Promise<APIResponse<T>> {
  const auth = await getValidAuth();
  if (!auth) {
    return {
      ok: false,
      status: 401,
      data: null as T,
      error: promptLogin(),
    };
  }

  return apiRequestWithAuth<T>(auth, method, path, body, options);
}

/**
 * Make an API request with explicit auth (used during login/init flow
 * before auth is persisted).
 */
export async function apiRequestWithAuth<T = unknown>(
  auth: AuthData,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  options?: { stream?: boolean }
): Promise<APIResponse<T>> {
  const { apiBase } = getConfig();
  const url = `${apiBase}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    "Content-Type": "application/json",
    "X-CLI-Version": "0.1.0",
    "X-Org-Id": auth.orgId,
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        data: null as T,
        error: "Session expired. Run `spokestack login` to re-authenticate.",
      };
    }

    if (res.status === 403) {
      const data = (await res.json().catch(() => ({}))) as Record<string, string>;
      return {
        ok: false,
        status: 403,
        data: data as unknown as T,
        error: data.message || "Access denied",
        upgradeRequired: true,
        requiredTier: data.requiredTier,
        message: data.message,
      };
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => ({ error: res.statusText }))) as Record<string, string>;
      return {
        ok: false,
        status: res.status,
        data: data as unknown as T,
        error: data.error || data.message || `Request failed (${res.status})`,
      };
    }

    if (options?.stream) {
      // Return raw response for SSE streaming
      return {
        ok: true,
        status: res.status,
        data: res as unknown as T,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      status: res.status,
      data: data as T,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Network error — is the API reachable?";
    return {
      ok: false,
      status: 0,
      data: null as T,
      error: message,
    };
  }
}

/**
 * Make an unauthenticated API request (used for signup/login).
 */
export async function apiPublicRequest<T = unknown>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: Record<string, unknown>
): Promise<APIResponse<T>> {
  const { apiBase } = getConfig();
  const url = `${apiBase}${path}`;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, string> & T;

    return {
      ok: res.ok,
      status: res.status,
      data: data as T,
      error: res.ok ? undefined : data.error || data.message || `Request failed (${res.status})`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Network error — is the API reachable?";
    return {
      ok: false,
      status: 0,
      data: null as T,
      error: message,
    };
  }
}

// Convenience wrappers

export function get<T = unknown>(path: string): Promise<APIResponse<T>> {
  return apiRequest<T>("GET", path);
}

export function post<T = unknown>(
  path: string,
  body?: Record<string, unknown>
): Promise<APIResponse<T>> {
  return apiRequest<T>("POST", path, body);
}

export function patch<T = unknown>(
  path: string,
  body?: Record<string, unknown>
): Promise<APIResponse<T>> {
  return apiRequest<T>("PATCH", path, body);
}

export function put<T = unknown>(
  path: string,
  body?: Record<string, unknown>
): Promise<APIResponse<T>> {
  return apiRequest<T>("PUT", path, body);
}

export function del<T = unknown>(path: string): Promise<APIResponse<T>> {
  return apiRequest<T>("DELETE", path);
}

/**
 * Start an SSE streaming request (used for agent chat).
 */
export async function streamRequest(
  path: string,
  body: Record<string, unknown>
): Promise<APIResponse<Response>> {
  return apiRequest<Response>("POST", path, body, { stream: true });
}
