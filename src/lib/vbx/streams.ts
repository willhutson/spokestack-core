import { SurfaceType } from "@prisma/client";
import { EventEmitter } from "events";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResponseChunk {
  id: string;
  sessionId: string;
  surface: SurfaceType;
  orgId: string;
  content: string;
  done: boolean;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Redis Streams implementation
// ---------------------------------------------------------------------------

let redisClient: any = null;
let redisReady = false;

async function getRedis(): Promise<any | null> {
  if (!process.env.REDIS_URL) return null;

  if (redisClient && redisReady) return redisClient;

  try {
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

function streamKey(sessionId: string): string {
  return `vbx:stream:${sessionId}`;
}

// ---------------------------------------------------------------------------
// In-memory EventEmitter fallback
// ---------------------------------------------------------------------------

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

// Keep recent chunks for late subscribers (per session)
const memoryStreams = new Map<string, ResponseChunk[]>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new stream for a session. In Redis this creates the stream key;
 * in-memory it initialises the buffer.
 */
export async function createStream(sessionId: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    // Create an empty stream with a dummy entry that we immediately trim
    const key = streamKey(sessionId);
    await redis.xAdd(key, "*", { _init: "1" });
    await redis.xTrim(key, "MAXLEN", 0);
    // Expire stream after 1 hour
    await redis.expire(key, 3600);
  } else {
    memoryStreams.set(sessionId, []);
  }
}

/**
 * Publish response chunks to a session stream.
 */
export async function publishResponse(
  orgId: string,
  sessionId: string,
  surface: SurfaceType,
  chunks: string[]
): Promise<void> {
  const redis = await getRedis();

  for (let i = 0; i < chunks.length; i++) {
    const chunk: ResponseChunk = {
      id: `${sessionId}-${Date.now()}-${i}`,
      sessionId,
      surface,
      orgId,
      content: chunks[i],
      done: i === chunks.length - 1,
      timestamp: Date.now(),
    };

    if (redis) {
      const key = streamKey(sessionId);
      await redis.xAdd(key, "*", {
        data: JSON.stringify(chunk),
      });
      // Keep streams capped and auto-expire
      await redis.xTrim(key, "MAXLEN", 1000);
      await redis.expire(key, 3600);
    } else {
      // In-memory fallback
      const buffer = memoryStreams.get(sessionId) ?? [];
      buffer.push(chunk);
      memoryStreams.set(sessionId, buffer);
      emitter.emit(`chunk:${sessionId}`, chunk);
    }
  }
}

/**
 * Subscribe to a session's response stream.
 * Returns a ReadableStream suitable for SSE responses.
 *
 * When Redis is available, uses XREAD with blocking.
 * Otherwise uses the in-memory EventEmitter.
 */
export function subscribeToSession(sessionId: string): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const redis = await getRedis();

      if (redis) {
        // Redis Streams consumer
        let lastId = "0";
        let active = true;

        const poll = async () => {
          while (active) {
            try {
              const results = await redis.xRead(
                [{ key: streamKey(sessionId), id: lastId }],
                { BLOCK: 5000, COUNT: 50 }
              );

              if (!results) continue;

              for (const stream of results) {
                for (const message of stream.messages) {
                  lastId = message.id;
                  const chunk: ResponseChunk = JSON.parse(
                    message.message.data
                  );
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
                  );
                  if (chunk.done) {
                    active = false;
                    controller.close();
                    return;
                  }
                }
              }
            } catch {
              active = false;
              controller.close();
              return;
            }
          }
        };

        poll();
      } else {
        // In-memory fallback — replay existing chunks then listen
        const existing = memoryStreams.get(sessionId) ?? [];
        for (const chunk of existing) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
          if (chunk.done) {
            controller.close();
            return;
          }
        }

        const handler = (chunk: ResponseChunk) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
          if (chunk.done) {
            emitter.off(`chunk:${sessionId}`, handler);
            controller.close();
          }
        };

        emitter.on(`chunk:${sessionId}`, handler);
      }
    },
  });
}
