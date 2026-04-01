export interface NangoProvider {
  id: string;
  module: string; // ModuleType
  scopes: string[];
  displayName?: string;
}

export interface NangoConnection {
  id: string;
  provider: string;
  organizationId: string;
  status: "connected" | "pending" | "error";
  lastSyncAt?: string;
  metadata?: Record<string, unknown>;
}
