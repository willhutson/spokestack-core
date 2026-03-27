import { SurfaceType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Surface formatting configuration
// ---------------------------------------------------------------------------

export interface SurfaceConfig {
  surface: SurfaceType;
  format: "text" | "markdown" | "plain";
  maxLength: number;
  supportsRichMedia: boolean;
  supportsStreaming: boolean;
}

const SURFACE_CONFIGS: Record<SurfaceType, SurfaceConfig> = {
  CLI: {
    surface: "CLI",
    format: "text",
    maxLength: 4096,
    supportsRichMedia: false,
    supportsStreaming: true,
  },
  WEB: {
    surface: "WEB",
    format: "markdown",
    maxLength: 16384,
    supportsRichMedia: true,
    supportsStreaming: true,
  },
  DESKTOP: {
    surface: "DESKTOP",
    format: "markdown",
    maxLength: 16384,
    supportsRichMedia: true,
    supportsStreaming: true,
  },
  MOBILE: {
    surface: "MOBILE",
    format: "markdown",
    maxLength: 8192,
    supportsRichMedia: true,
    supportsStreaming: true,
  },
  WHATSAPP: {
    surface: "WHATSAPP",
    format: "plain",
    maxLength: 4096,
    supportsRichMedia: false,
    supportsStreaming: false,
  },
};

/**
 * Get the formatting rules for a given surface.
 */
export function getSurfaceConfig(surface: SurfaceType): SurfaceConfig {
  return SURFACE_CONFIGS[surface];
}

// ---------------------------------------------------------------------------
// Response formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a raw agent response for a specific surface.
 */
function formatForSurface(content: string, config: SurfaceConfig): string {
  let formatted = content;

  switch (config.format) {
    case "text":
      // Strip markdown formatting for CLI
      formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/#{1,6}\s+/g, "")
        .replace(/```[\s\S]*?```/g, (match) =>
          match.replace(/```\w*\n?/g, "").replace(/```/g, "")
        );
      break;
    case "plain":
      // Strip all formatting for WhatsApp
      formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, "*$1*") // bold → WhatsApp bold
        .replace(/#{1,6}\s+/g, "")
        .replace(/```[\s\S]*?```/g, (match) =>
          match.replace(/```\w*\n?/g, "").replace(/```/g, "")
        )
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // strip links
      break;
    case "markdown":
      // Keep as-is for web/desktop
      break;
  }

  // Enforce max length
  if (formatted.length > config.maxLength) {
    formatted = formatted.slice(0, config.maxLength - 3) + "...";
  }

  return formatted;
}

export interface RoutedResponse {
  surface: SurfaceType;
  content: string;
  orgId: string;
}

/**
 * Route and format a response for the target surface.
 */
export function routeToSurface(
  response: string,
  surface: SurfaceType,
  orgId: string
): RoutedResponse {
  const config = getSurfaceConfig(surface);
  const content = formatForSurface(response, config);

  return {
    surface,
    content,
    orgId,
  };
}
