/**
 * System prompt injection detection for marketplace modules.
 * Runs at publish time alongside tool validation.
 */

const INJECTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /ignore (previous|all|the above) instructions/i, label: "instruction override" },
  { pattern: /you are now/i, label: "identity override" },
  { pattern: /pretend (you are|to be)/i, label: "identity impersonation" },
  { pattern: /disregard (your|the) (system|previous)/i, label: "system override" },
  { pattern: /act as (a|an) (different|new|another)/i, label: "role injection" },
  { pattern: /override (your|the) (instructions|prompt|system)/i, label: "override injection" },
  { pattern: /forget (everything|what|your)/i, label: "memory wipe attempt" },
  { pattern: /<\/?system>/i, label: "XML system injection" },
  { pattern: /\[INST\]/i, label: "instruction delimiter injection" },
  { pattern: /###\s*(instructions?|system|prompt)/i, label: "markdown injection" },
];

export interface PromptSecurityReport {
  passed: boolean;
  injectionPatternsFound: string[];
  lengthOk: boolean;
  hasSubstance: boolean;
  charCount: number;
}

export function validateSystemPrompt(prompt: string): PromptSecurityReport {
  const found = INJECTION_PATTERNS
    .filter(({ pattern }) => pattern.test(prompt))
    .map(({ label }) => label);

  const lengthOk = prompt.length <= 10000;
  const hasSubstance = prompt.length >= 50;

  return {
    passed: found.length === 0 && lengthOk && hasSubstance,
    injectionPatternsFound: found,
    lengthOk,
    hasSubstance,
    charCount: prompt.length,
  };
}
