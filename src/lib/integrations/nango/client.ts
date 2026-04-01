import { Nango } from "@nangohq/node";

let _client: Nango | null = null;

function getSecretKey(): string {
  const key = process.env.NANGO_SECRET_KEY;
  if (!key) {
    throw new Error("NANGO_SECRET_KEY environment variable is not set");
  }
  return key;
}

export function getNangoClient(): Nango {
  if (!_client) {
    _client = new Nango({
      secretKey: getSecretKey(),
      host: process.env.NANGO_HOST || undefined,
    });
  }
  return _client;
}

export function isNangoConfigured(): boolean {
  return !!process.env.NANGO_SECRET_KEY;
}

/**
 * Create a connect session so the frontend can open the Nango auth flow.
 */
export async function createConnection(params: {
  providerConfigKey: string;
  organizationId: string;
  connectionId: string;
}) {
  const nango = getNangoClient();
  const session = await nango.createConnectSession({
    end_user: {
      id: params.organizationId,
    },
  });
  return session;
}

/**
 * Get a connection from Nango by provider config key and connection ID.
 */
export async function getConnection(
  providerConfigKey: string,
  connectionId: string
) {
  const nango = getNangoClient();
  return nango.getConnection(providerConfigKey, connectionId);
}

/**
 * List all connections, optionally filtered by connectionId (our org ID).
 */
export async function listConnections(connectionId?: string) {
  const nango = getNangoClient();
  return nango.listConnections(connectionId);
}

/**
 * Delete a connection from Nango.
 */
export async function deleteConnection(
  providerConfigKey: string,
  connectionId: string
) {
  const nango = getNangoClient();
  return nango.deleteConnection(providerConfigKey, connectionId);
}

/**
 * Proxy an API request through Nango to the external provider.
 */
export async function proxyRequest<T = unknown>(
  connectionId: string,
  providerConfigKey: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown
) {
  const nango = getNangoClient();
  return nango.proxy<T>({
    providerConfigKey,
    connectionId,
    method,
    endpoint,
    ...(body ? { data: body } : {}),
  });
}
