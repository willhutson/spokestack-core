import { BillingTierType } from "@prisma/client";

// ── Tier Limits (requests per minute) ───────────────────────────────────

const TIER_LIMITS: Record<BillingTierType, number> = {
  FREE: 20,
  STARTER: 40,
  PRO: 80,
  BUSINESS: 200,
  ENTERPRISE: Infinity,
};

const WINDOW_MS = 60_000; // 1 minute sliding window

// ── In-Memory Sliding Window (fallback when Redis unavailable) ──────────

interface WindowEntry {
  timestamps: number[];
}

const memoryWindows = new Map<string, WindowEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [key, entry] of memoryWindows) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      memoryWindows.delete(key);
    }
  }
}, 300_000);

// ── Redis Client (lazy initialization) ──────────────────────────────────

let redisClient: RedisLike | null = null;
let redisInitialized = false;

interface RedisLike {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  pttl(key: string): Promise<number>;
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown>;
  quit(): Promise<void>;
}

async function getRedis(): Promise<RedisLike | null> {
  if (redisInitialized) return redisClient;
  redisInitialized = true;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL not set — rate limiter using in-memory fallback");
    return null;
  }

  try {
    // Dynamic import so the module is optional
    const { createClient } = await import("redis" as string);
    const client = createClient({ url: redisUrl });
    await client.connect();
    redisClient = client as unknown as RedisLike;
    console.log("Rate limiter connected to Redis");
    return redisClient;
  } catch (err) {
    console.warn("Redis connection failed — rate limiter using in-memory fallback:", err);
    return null;
  }
}

// ── Rate Limit Check ────────────────────────────────────────────────────

/**
 * Check if an organization is within its rate limit.
 *
 * Returns { allowed: true } if the request can proceed,
 * or { allowed: false, retryAfterMs } if rate limited.
 */
export async function checkRateLimit(
  orgId: string,
  tier: BillingTierType
): Promise<{ allowed: boolean; retryAfterMs?: number; remaining?: number }> {
  const limit = TIER_LIMITS[tier];
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity };
  }

  const redis = await getRedis();
  if (redis) {
    return checkRedisRateLimit(redis, orgId, limit);
  }
  return checkMemoryRateLimit(orgId, limit);
}

/**
 * Wait until rate limit clears, then return.
 * Polls at 500ms intervals. Times out after 30 seconds.
 */
export async function waitForRateLimit(
  orgId: string,
  tier: BillingTierType
): Promise<void> {
  const maxWait = 30_000;
  const pollInterval = 500;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const result = await checkRateLimit(orgId, tier);
    if (result.allowed) return;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Rate limit wait timed out after ${maxWait}ms for org ${orgId}`);
}

/**
 * Get the configured limit for a tier.
 */
export function getTierLimit(tier: BillingTierType): number {
  return TIER_LIMITS[tier];
}

// ── Redis Implementation ────────────────────────────────────────────────

async function checkRedisRateLimit(
  redis: RedisLike,
  orgId: string,
  limit: number
): Promise<{ allowed: boolean; retryAfterMs?: number; remaining?: number }> {
  const windowKey = `ratelimit:${orgId}:${currentWindowKey()}`;

  try {
    const count = await redis.incr(windowKey);
    if (count === 1) {
      // First request in this window — set expiry
      await redis.expire(windowKey, Math.ceil(WINDOW_MS / 1000) + 1);
    }

    if (count > limit) {
      const ttl = await redis.pttl(windowKey);
      return {
        allowed: false,
        retryAfterMs: ttl > 0 ? ttl : WINDOW_MS,
        remaining: 0,
      };
    }

    return { allowed: true, remaining: limit - count };
  } catch (err) {
    // Fail open on Redis errors
    console.error("Redis rate limit check failed, allowing request:", err);
    return { allowed: true, remaining: limit };
  }
}

// ── In-Memory Implementation ────────────────────────────────────────────

function checkMemoryRateLimit(
  orgId: string,
  limit: number
): { allowed: boolean; retryAfterMs?: number; remaining?: number } {
  const now = Date.now();
  const key = `ratelimit:${orgId}`;

  let entry = memoryWindows.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryWindows.set(key, entry);
  }

  // Remove timestamps outside the window
  const windowStart = now - WINDOW_MS;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= limit) {
    // Rate limited — calculate when the oldest entry in the window expires
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 100),
      remaining: 0,
    };
  }

  // Record this request
  entry.timestamps.push(now);
  return { allowed: true, remaining: limit - entry.timestamps.length };
}

// ── Helpers ─────────────────────────────────────────────────────────────

function currentWindowKey(): string {
  // Round to the nearest minute for the Redis key
  const now = Date.now();
  const windowId = Math.floor(now / WINDOW_MS);
  return String(windowId);
}
