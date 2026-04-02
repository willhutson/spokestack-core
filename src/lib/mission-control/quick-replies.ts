// Quick Replies — parse [QUICK_REPLY] blocks from agent responses

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuickReply {
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// parseQuickReplies
// ---------------------------------------------------------------------------

const QUICK_REPLY_REGEX = /\[QUICK_REPLY:([^\]]+)\]/g;

export function parseQuickReplies(response: string): QuickReply[] {
  const replies: QuickReply[] = [];

  let match: RegExpExecArray | null;
  while ((match = QUICK_REPLY_REGEX.exec(response)) !== null) {
    const raw = match[1].trim();

    // Support "label|value" format or just "label" (value = label)
    const pipeIdx = raw.indexOf("|");
    if (pipeIdx > -1) {
      replies.push({
        label: raw.slice(0, pipeIdx).trim(),
        value: raw.slice(pipeIdx + 1).trim(),
      });
    } else {
      replies.push({ label: raw, value: raw });
    }
  }

  return replies;
}

// ---------------------------------------------------------------------------
// stripQuickReplies — remove quick reply blocks from response text
// ---------------------------------------------------------------------------

export function stripQuickReplies(response: string): string {
  return response.replace(QUICK_REPLY_REGEX, "").trim();
}
