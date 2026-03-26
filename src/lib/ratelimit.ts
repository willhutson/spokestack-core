import { BillingTierType } from "@prisma/client";

/**
 * Per-tier rate limits (requests per minute).
 */
const TIER_RATE_LIMITS: Record<BillingTierType, number> = {
  FREE: 20,
  STARTER: 40,
  PRO: 80,
  BUSINESS: 200,
  ENTERPRISE: Infinity,
};

const WINDOW_MS = 60_000; // 1 minute sliding window

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // seconds
}

// ---------------------------------------------------------------------------
// Redis-backed implementation (production)
// ---------------------------------------------------------------------------

let redisClient: any = null;
let redisReady = false;

async function getRedis(): Promise<any | null> {
  if (!process.env.REDIS_URL) return null;

  if (redisClient && redisReady) return redisClient;

  try {
    // Dynamic import — avoids hard dependency for dev environments
    const { createClient } = await import("redis");
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", () => {
      redisReady = false;
    });
    await redisClient.connect();
    redisReady = true;
    return redisClient;
  } catch {
    redisReady = false;
    return null;
  }
}

async function checkWithRedis(
  key: string,
  limit: number
): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (!redis) return checkWithMemory(key, limit);

  try {
    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / WINDOW_MS)}`;

    const count = await redis.incr(windowKey);
    if (count === 1) {
      // First request in this window — set TTL so key auto-expires
      await redis.expire(windowKey, Math.ceil(WINDOW_MS / 1000) + 1);
    }

    const remaining = Math.max(0, limit - count);
    if (count > limit) {
      const retryAfter = Math.ceil(
        (WINDOW_MS - (now % WINDOW_MS)) / 1000
      );
      return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining };
  } catch {
    // Fall back to in-memory if Redis command fails
    return checkWithMemory(key, limit);
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback (development / no Redis)
// ---------------------------------------------------------------------------

interface MemoryBucket {
  count: number;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryBucket>();

function checkWithMemory(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const bucketKey = `ratelimit:${key}`;

  let bucket = memoryStore.get(bucketKey);

  // Expired or missing — start a fresh window
  if (!bucket || bucket.expiresAt <= now) {
    bucket = { count: 0, expiresAt: now + WINDOW_MS };
    memoryStore.set(bucketKey, bucket);
  }

  bucket.count += 1;

  const remaining = Math.max(0, limit - bucket.count);

  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.expiresAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining };
}

// Periodically prune expired memory buckets (every 60 s)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore) {
      if (bucket.expiresAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 60_000).unref?.();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether an org is within its rate limit for the current minute window.
 *
 * Uses Redis INCR + EXPIRE when REDIS_URL is set; falls back to an
 * in-memory Map for local development.
 */
export async function checkRateLimit(
  orgId: string,
  tier: BillingTierType
): Promise<RateLimitResult> {
  const limit = TIER_RATE_LIMITS[tier];

  // Enterprise has no limit
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity };
  }

  return checkWithRedis(orgId, limit);
}
