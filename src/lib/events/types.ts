export type EventAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "assigned"
  | "sync_completed";

export interface EventPayload {
  organizationId: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}
