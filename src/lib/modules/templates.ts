export const INDUSTRY_TEMPLATES: Record<
  string,
  { label: string; modules: string[] }
> = {
  agency: {
    label: "Creative Agency",
    modules: [
      "CRM",
      "CONTENT_STUDIO",
      "WORKFLOWS",
      "TIME_LEAVE",
      "SOCIAL_PUBLISHING",
    ],
  },
  saas: {
    label: "SaaS / Tech",
    modules: ["CRM", "ANALYTICS", "WORKFLOWS", "NPS", "FINANCE"],
  },
  services: {
    label: "Professional Services",
    modules: ["CRM", "TIME_LEAVE", "FINANCE", "NPS", "WORKFLOWS"],
  },
  ecommerce: {
    label: "E-commerce",
    modules: ["CRM", "ANALYTICS", "SOCIAL_PUBLISHING", "FINANCE"],
  },
  construction: {
    label: "Construction / Trades",
    modules: ["TIME_LEAVE", "WORKFLOWS", "FINANCE"],
  },
  consulting: {
    label: "Consulting",
    modules: ["CRM", "TIME_LEAVE", "FINANCE", "ANALYTICS"],
  },
  media: {
    label: "Media / Publishing",
    modules: [
      "CONTENT_STUDIO",
      "SOCIAL_PUBLISHING",
      "ANALYTICS",
      "CRM",
    ],
  },
  education: {
    label: "Education",
    modules: ["LMS", "NPS", "WORKFLOWS", "ANALYTICS"],
  },
};

export function getAvailableTemplates(): string[] {
  return Object.keys(INDUSTRY_TEMPLATES);
}

export function getTemplate(
  industry: string
): { label: string; modules: string[] } | undefined {
  return INDUSTRY_TEMPLATES[industry.toLowerCase()];
}
