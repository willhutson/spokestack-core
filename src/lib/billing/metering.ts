import { prisma } from "@/lib/prisma";
import { AgentType, MeterEventType } from "@prisma/client";

/**
 * Record an agent call meter event.
 */
export async function meterAgentCall(
  orgId: string,
  agentType: AgentType,
  tokenCount: number,
  model: string
): Promise<void> {
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: orgId },
    select: { id: true },
  });

  if (!billing) return;

  await prisma.billingMeterEvent.create({
    data: {
      billingAccountId: billing.id,
      eventType: MeterEventType.AGENT_CALL,
      quantity: tokenCount,
      metadata: { agentType, model },
    },
  });
}

/**
 * Record storage usage meter event.
 */
export async function meterStorageUsage(
  orgId: string,
  bytes: number
): Promise<void> {
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: orgId },
    select: { id: true },
  });

  if (!billing) return;

  await prisma.billingMeterEvent.create({
    data: {
      billingAccountId: billing.id,
      eventType: MeterEventType.STORAGE_BYTE,
      quantity: bytes,
    },
  });
}

/**
 * Record a module install meter event.
 */
export async function meterModuleInstall(
  orgId: string,
  moduleType: string
): Promise<void> {
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: orgId },
    select: { id: true },
  });

  if (!billing) return;

  await prisma.billingMeterEvent.create({
    data: {
      billingAccountId: billing.id,
      eventType: MeterEventType.MODULE_INSTALL,
      quantity: 1,
      metadata: { moduleType },
    },
  });
}

export interface UsageStats {
  agentCalls: number;
  totalTokens: number;
  storageBytes: number;
  moduleInstalls: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Aggregate usage stats for an org within a billing period.
 * Defaults to the current calendar month if no period is given.
 */
export async function getUsageStats(
  orgId: string,
  period?: { start: Date; end: Date }
): Promise<UsageStats> {
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: orgId },
    select: { id: true },
  });

  if (!billing) {
    const now = new Date();
    return {
      agentCalls: 0,
      totalTokens: 0,
      storageBytes: 0,
      moduleInstalls: 0,
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: now,
    };
  }

  const now = new Date();
  const periodStart = period?.start ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = period?.end ?? now;

  const events = await prisma.billingMeterEvent.findMany({
    where: {
      billingAccountId: billing.id,
      timestamp: { gte: periodStart, lte: periodEnd },
    },
  });

  let agentCalls = 0;
  let totalTokens = 0;
  let storageBytes = 0;
  let moduleInstalls = 0;

  for (const event of events) {
    switch (event.eventType) {
      case MeterEventType.AGENT_CALL:
        agentCalls += 1;
        totalTokens += event.quantity;
        break;
      case MeterEventType.STORAGE_BYTE:
        storageBytes += event.quantity;
        break;
      case MeterEventType.MODULE_INSTALL:
        moduleInstalls += event.quantity;
        break;
    }
  }

  return {
    agentCalls,
    totalTokens,
    storageBytes,
    moduleInstalls,
    periodStart,
    periodEnd,
  };
}
