// Mission Control types — adapted from ERP MCChat/MCMessage to use
// spokestack-core's AgentSession/AgentMessage models

export type AgentType =
  | "assistant" | "content_strategist" | "brief_writer" | "deck_designer"
  | "video_director" | "document_writer" | "analyst" | "media_buyer"
  | "course_designer" | "contract_analyzer" | "resource_planner" | "ui_designer"
  | "onboarding";

export type AgentStatus = "idle" | "thinking" | "working" | "error";
export type ChatStatus = "active" | "complete" | "archived";
export type MessageRole = "user" | "agent" | "system";
export type ArtifactType = "calendar" | "deck" | "brief" | "document" | "moodboard" | "video_script" | "report" | "table" | "timeline" | "contract" | "stitch_design";
export type ArtifactStatus = "building" | "draft" | "final" | "sent" | "archived";
export type NotificationType = "info" | "success" | "warning" | "error" | "agent_complete" | "artifact_ready";

// Mapped to AgentSession
export interface MCChat {
  id: string;
  organizationId: string;
  userId?: string | null;
  title: string;
  agentType: string;
  status: ChatStatus;
  agentStatus: AgentStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  lastActivityAt?: string | Date;
  messages?: MCMessage[];
  _count?: { messages: number };
}

// Mapped to AgentMessage
export interface MCMessage {
  id: string;
  chatId: string;
  role: string;
  content: string;
  agentType?: string | null;
  skillsUsed?: string[];
  toolCalls?: unknown[];
  isComplete?: boolean;
  createdAt: string | Date;
}

export interface MCArtifact {
  id: string;
  chatId?: string | null;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  version: number;
  data: unknown;
  preview?: string | null;
  createdAt: string | Date;
}

export interface MCNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  read: boolean;
  dismissed?: boolean;
  chatId?: string | null;
  createdAt: string | Date;
}

export interface AgentDefinition {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  category: string;
  capabilities: string[];
  defaultModel: string;
  color: string;
}

export interface CommandItem {
  id: string;
  type: "chat" | "agent" | "artifact" | "action";
  title: string;
  subtitle?: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
}

export type CommandItemType = CommandItem["type"];
