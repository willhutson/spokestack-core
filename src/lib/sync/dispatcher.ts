import { prisma } from "@/lib/prisma";
import { runSync } from "./runner";
import type { SyncResult } from "./types";

/**
 * Query all active integrations that are due for sync and dispatch a SyncJob
 * for each one.
 */
export async function dispatchSyncs(): Promise<SyncResult> {
  const now = new Date();

  // Find integrations where sync is due:
  // status = ACTIVE, syncEnabled = true, and either never synced or interval elapsed
  const integrations = await prisma.integration.findMany({
    where: {
      status: "ACTIVE",
      syncEnabled: true,
      OR: [
        { lastSyncAt: null },
        {
          // Raw filter: lastSyncAt + syncInterval (minutes) < now
          lastSyncAt: { lt: new Date(now.getTime() - 1) }, // placeholder, refined below
        },
      ],
    },
  });

  // Filter precisely: lastSyncAt + syncInterval (in minutes) < now
  const dueIntegrations = integrations.filter((int) => {
    if (!int.lastSyncAt) return true;
    const intervalMs = (int.syncInterval ?? 120) * 60 * 1000;
    return int.lastSyncAt.getTime() + intervalMs < now.getTime();
  });

  const orgIds = new Set<string>();

  for (const integration of dueIntegrations) {
    const syncJob = await prisma.syncJob.create({
      data: {
        organizationId: integration.organizationId,
        integrationId: integration.id,
        provider: integration.provider,
        status: "PENDING",
      },
    });

    orgIds.add(integration.organizationId);

    // Fire-and-forget
    runSync(syncJob.id).catch((err) => {
      console.error(`[sync-dispatcher] runSync failed for job ${syncJob.id}:`, err);
    });
  }

  return {
    dispatched: dueIntegrations.length,
    orgIds: Array.from(orgIds),
  };
}
