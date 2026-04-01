import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events/emitter";

/**
 * Execute a single sync job: mark as RUNNING, fetch data via Nango proxy,
 * update counts, and mark complete. Always emits an Integration.sync_completed event.
 */
export async function runSync(syncJobId: string): Promise<void> {
  const job = await prisma.syncJob.update({
    where: { id: syncJobId },
    data: { status: "RUNNING", startedAt: new Date() },
    include: { integration: true },
  });

  const { integration } = job;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let syncError: string | undefined;

  try {
    // Fetch records from Nango proxy
    const nangoBaseUrl = process.env.NANGO_BASE_URL ?? "https://api.nango.dev";
    const nangoSecretKey = process.env.NANGO_SECRET_KEY;

    const response = await fetch(
      `${nangoBaseUrl}/proxy/${integration.provider}/records`,
      {
        headers: {
          Authorization: `Bearer ${nangoSecretKey}`,
          "Connection-Id": integration.nangoConnectionId ?? "",
          "Provider-Config-Key": integration.provider,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nango proxy returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const records = Array.isArray(data) ? data : data.records ?? [];

    // For now, count records; actual upsert logic is provider-specific
    recordsCreated = records.length;
    recordsUpdated = 0;
    recordsSkipped = 0;

    // Mark job successful
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: "SUCCESS",
        completedAt: new Date(),
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
      },
    });

    // Update integration lastSyncAt
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        syncError: null,
        lastSyncResult: { recordsCreated, recordsUpdated, recordsSkipped },
      },
    });
  } catch (err) {
    syncError = err instanceof Error ? err.message : String(err);
    console.error(`[sync-runner] job ${syncJobId} failed:`, syncError);

    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errors: { message: syncError },
      },
    });

    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncError },
    });
  } finally {
    // Always emit sync_completed event
    await emitEvent(
      integration.organizationId,
      "Integration",
      integration.id,
      "sync_completed",
      {
        syncJobId,
        provider: integration.provider,
        status: syncError ? "FAILED" : "SUCCESS",
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        error: syncError,
      }
    );
  }
}
