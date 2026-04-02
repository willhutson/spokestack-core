// Artifact Extraction — parse structured artifacts from agent responses
// Handles [ARTIFACT_START] blocks and SSE event parsing.

import type { AgentArtifact } from "./agent-builder-client";

// ---------------------------------------------------------------------------
// extractArtifactsFromResponse
// ---------------------------------------------------------------------------

const ARTIFACT_REGEX =
  /\[ARTIFACT_START:(\w+)\]\s*\n([\s\S]*?)\n\[ARTIFACT_END\]/g;

export interface ExtractedArtifact {
  type: string;
  title: string;
  data: unknown;
  raw: string;
}

export function extractArtifactsFromResponse(
  response: string
): ExtractedArtifact[] {
  const artifacts: ExtractedArtifact[] = [];

  let match: RegExpExecArray | null;
  while ((match = ARTIFACT_REGEX.exec(response)) !== null) {
    const type = match[1];
    const raw = match[2].trim();

    let data: unknown = raw;
    let title = type;

    try {
      const parsed = JSON.parse(raw);
      data = parsed;
      title = parsed.title ?? parsed.name ?? type;
    } catch {
      // Not JSON — keep as raw string
    }

    artifacts.push({ type, title, data, raw });
  }

  return artifacts;
}

// ---------------------------------------------------------------------------
// stripArtifactBlocks — remove artifact blocks from response text
// ---------------------------------------------------------------------------

export function stripArtifactBlocks(response: string): string {
  return response.replace(ARTIFACT_REGEX, "").trim();
}

// ---------------------------------------------------------------------------
// toAgentArtifact — convert extracted artifact to AgentArtifact shape
// ---------------------------------------------------------------------------

let artifactCounter = 0;

export function toAgentArtifact(extracted: ExtractedArtifact): AgentArtifact {
  artifactCounter += 1;
  return {
    id: `artifact-${Date.now()}-${artifactCounter}`,
    type: extracted.type,
    title: extracted.title,
    data: extracted.data,
    version: 1,
  };
}

// ---------------------------------------------------------------------------
// parseSSEEvent — parse a single SSE data line
// ---------------------------------------------------------------------------

export interface ParsedSSEEvent {
  event: string;
  data: unknown;
  raw: string;
}

export function parseSSEEvent(line: string): ParsedSSEEvent | null {
  if (!line.startsWith("data: ")) return null;

  const raw = line.slice(6).trim();
  if (raw === "[DONE]") {
    return { event: "done", data: null, raw };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      event: parsed.event ?? "message",
      data: parsed,
      raw,
    };
  } catch {
    return {
      event: "text",
      data: raw,
      raw,
    };
  }
}
