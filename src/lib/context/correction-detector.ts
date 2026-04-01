export interface CorrectionResult {
  isCorrection: boolean;
  correctedFact?: string;
  preferenceKey?: string;
  preferenceValue?: {
    original: string;
    corrected: string;
    context: string;
  };
}

const CORRECTION_STARTERS = [
  /^no[,.]?\s/i,
  /^actually[,.]?\s/i,
  /^that'?s?\s+(wrong|incorrect|not right)/i,
  /^wrong[,.]?\s/i,
  /^not\s+\w+[,.]?\s+it'?s?\s+/i,
  /^wait[,.]?\s/i,
  /^that\s+should\s+be/i,
  /^i\s+said\s+/i,
  /^you\s+got\s+it\s+wrong/i,
  /^incorrect[,.]?\s/i,
  /^fix(ed)?[,:]?\s/i,
  /^correction[,:]?\s/i,
  /not\s+\w+,\s+it'?s\s+/i,
];

const CORRECTION_PATTERN =
  /(?:not|instead of|rather than)\s+["']?(.+?)["']?,?\s+(?:it'?s?|use|the\s+correct\s+(?:word|term|answer)\s+is)\s+["']?(.+?)["']?[.!]/i;
const IT_IS_PATTERN =
  /it'?s?\s+(not|never)\s+["']?(.+?)["']?,?\s+it'?s?\s+["']?(.+?)["']?/i;
const SHOULD_BE_PATTERN =
  /(?:should|must|needs?\s+to)\s+be\s+["']?(.+?)["']?/i;

function extractTopicFromAgentMessage(agentMessage: string): string {
  const firstSentence = agentMessage.split(/[.!?]/)[0] ?? agentMessage;
  return firstSentence
    .slice(0, 60)
    .replace(/[^a-z0-9\s]/gi, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * Detect whether a user message is correcting something the agent said.
 * Pattern-based — no LLM required for v1.
 */
export function detectCorrection(
  userMessage: string,
  previousAgentMessage: string
): CorrectionResult {
  const trimmed = userMessage.trim();

  const starterMatch = CORRECTION_STARTERS.some((pattern) =>
    pattern.test(trimmed)
  );
  if (!starterMatch) {
    return { isCorrection: false };
  }

  let original = "";
  let corrected = "";

  const correctionMatch = trimmed.match(CORRECTION_PATTERN);
  if (correctionMatch) {
    original = correctionMatch[1].trim();
    corrected = correctionMatch[2].trim();
  }

  const itIsMatch = trimmed.match(IT_IS_PATTERN);
  if (itIsMatch && !correctionMatch) {
    original = itIsMatch[2].trim();
    corrected = itIsMatch[3].trim();
  }

  const shouldBeMatch = trimmed.match(SHOULD_BE_PATTERN);
  if (shouldBeMatch && !correctionMatch && !itIsMatch) {
    corrected = shouldBeMatch[1].trim();
    original = "";
  }

  const topic = extractTopicFromAgentMessage(previousAgentMessage);
  const preferenceKey = `correction.${topic}`;

  return {
    isCorrection: true,
    correctedFact: corrected || trimmed,
    preferenceKey,
    preferenceValue: {
      original: original || "(see previous agent response)",
      corrected: corrected || trimmed,
      context: previousAgentMessage.slice(0, 200),
    },
  };
}
