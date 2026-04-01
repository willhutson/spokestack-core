import type { AgentDefinition, AgentType, ArtifactType, ArtifactStatus } from "./types";

export const AGENTS: Record<string, AgentDefinition> = {
  assistant: { type: "assistant", name: "Assistant", description: "General purpose AI assistant", icon: "🤖", category: "strategy", capabilities: ["Answer questions", "Write content", "Analyze data"], defaultModel: "claude-sonnet-4", color: "from-blue-500 to-cyan-500" },
  content_strategist: { type: "content_strategist", name: "Content Strategist", description: "Plans content campaigns", icon: "📋", category: "content", capabilities: ["Content strategy", "Editorial calendar"], defaultModel: "claude-sonnet-4", color: "from-purple-500 to-violet-600" },
  brief_writer: { type: "brief_writer", name: "Brief Writer", description: "Creates detailed creative briefs", icon: "📝", category: "content", capabilities: ["Creative briefs", "Project specs"], defaultModel: "claude-sonnet-4", color: "from-green-500 to-emerald-600" },
  deck_designer: { type: "deck_designer", name: "Deck Designer", description: "Creates presentation decks", icon: "🎨", category: "content", capabilities: ["Presentations", "Pitch decks"], defaultModel: "claude-sonnet-4", color: "from-orange-500 to-amber-600" },
  video_director: { type: "video_director", name: "Video Director", description: "Scripts and directs video", icon: "🎬", category: "content", capabilities: ["Video scripts", "Storyboards"], defaultModel: "claude-sonnet-4", color: "from-red-500 to-rose-600" },
  document_writer: { type: "document_writer", name: "Document Writer", description: "Writes long-form documents", icon: "📄", category: "content", capabilities: ["Reports", "Proposals"], defaultModel: "claude-sonnet-4", color: "from-slate-500 to-gray-600" },
  analyst: { type: "analyst", name: "Analyst", description: "Analyzes data and insights", icon: "📊", category: "analytics", capabilities: ["Data analysis", "Reports"], defaultModel: "claude-sonnet-4", color: "from-cyan-500 to-teal-600" },
  media_buyer: { type: "media_buyer", name: "Media Buyer", description: "Plans media placements", icon: "📺", category: "strategy", capabilities: ["Media planning", "Budget allocation"], defaultModel: "claude-sonnet-4", color: "from-indigo-500 to-blue-600" },
  course_designer: { type: "course_designer", name: "Course Designer", description: "Designs training courses", icon: "🎓", category: "content", capabilities: ["Course outlines", "Assessments"], defaultModel: "claude-sonnet-4", color: "from-emerald-500 to-green-600" },
  contract_analyzer: { type: "contract_analyzer", name: "Contract Analyzer", description: "Reviews legal documents", icon: "⚖️", category: "operations", capabilities: ["Contract review", "Risk assessment"], defaultModel: "claude-opus-4", color: "from-rose-500 to-red-600" },
  resource_planner: { type: "resource_planner", name: "Resource Planner", description: "Plans team capacity", icon: "👥", category: "operations", capabilities: ["Capacity planning", "Utilization"], defaultModel: "claude-sonnet-4", color: "from-violet-500 to-purple-600" },
  ui_designer: { type: "ui_designer", name: "UI Designer", description: "Designs UI flows", icon: "🖼️", category: "content", capabilities: ["UI specs", "Component specs"], defaultModel: "claude-sonnet-4", color: "from-pink-500 to-fuchsia-600" },
  onboarding: { type: "onboarding", name: "Onboarding Agent", description: "Helps set up your workspace", icon: "🚀", category: "strategy", capabilities: ["Workspace setup", "Module recommendations"], defaultModel: "claude-sonnet-4", color: "from-indigo-500 to-violet-500" },
};

export const QUICK_AGENTS: AgentType[] = ["assistant", "brief_writer", "content_strategist", "analyst"];

export const MC_API = {
  chats: "/api/v1/mission-control/chats",
  chat: (id: string) => `/api/v1/mission-control/chats/${id}`,
  messages: (chatId: string) => `/api/v1/mission-control/chats/${chatId}/messages`,
  agents: "/api/v1/mission-control/agents",
  notifications: "/api/v1/mission-control/notifications",
  artifacts: "/api/v1/mission-control/artifacts",
};

export const ARTIFACT_CONFIG: Record<ArtifactType, { label: string; icon: string; color: string }> = {
  calendar: { label: "Content Calendar", icon: "📅", color: "text-blue-500" },
  deck: { label: "Presentation", icon: "🎨", color: "text-orange-500" },
  brief: { label: "Creative Brief", icon: "📝", color: "text-green-500" },
  document: { label: "Document", icon: "📄", color: "text-gray-500" },
  moodboard: { label: "Moodboard", icon: "🖼️", color: "text-pink-500" },
  video_script: { label: "Video Script", icon: "🎬", color: "text-red-500" },
  report: { label: "Report", icon: "📊", color: "text-cyan-500" },
  table: { label: "Table", icon: "📋", color: "text-slate-500" },
  timeline: { label: "Timeline", icon: "📅", color: "text-violet-500" },
  contract: { label: "Contract", icon: "⚖️", color: "text-rose-500" },
  stitch_design: { label: "Stitch Design", icon: "🎭", color: "text-teal-500" },
};

export const ARTIFACT_STATUS_CONFIG: Record<ArtifactStatus, { label: string; color: string }> = {
  building: { label: "Building", color: "text-green-500" },
  draft: { label: "Draft", color: "text-amber-500" },
  final: { label: "Final", color: "text-green-600" },
  sent: { label: "Sent", color: "text-blue-500" },
  archived: { label: "Archived", color: "text-gray-400" },
};
