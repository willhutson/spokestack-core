export interface SyncConfig {
  integrationId: string;
  organizationId: string;
  provider: string;
  nangoConnectionId: string;
  config?: Record<string, unknown>;
}

export interface SyncResult {
  dispatched: number;
  orgIds: string[];
}
