// Knowledge Context — inject knowledge documents into agent prompts
// Retrieves and formats knowledge content for prompt enrichment.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeDocRef {
  id: string;
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// injectKnowledgeContext
// ---------------------------------------------------------------------------

const MAX_KNOWLEDGE_CHARS = 8000;

export function injectKnowledgeContext(
  basePrompt: string,
  knowledgeDocs: KnowledgeDocRef[]
): string {
  if (!knowledgeDocs.length) return basePrompt;

  const sections: string[] = [
    basePrompt,
    "",
    "## Knowledge Base",
    "The following reference documents are available for your context:",
    "",
  ];

  let charCount = 0;

  for (const doc of knowledgeDocs) {
    const entry = `### ${doc.title}\n${doc.content}\n`;

    if (charCount + entry.length > MAX_KNOWLEDGE_CHARS) {
      sections.push(
        `(${knowledgeDocs.length - knowledgeDocs.indexOf(doc)} additional documents truncated for context length)`
      );
      break;
    }

    sections.push(entry);
    charCount += entry.length;
  }

  return sections.join("\n");
}
