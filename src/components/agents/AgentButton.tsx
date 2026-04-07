"use client";

import { Sparkles } from "lucide-react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useEmbeddedChat } from "@/hooks/useEmbeddedChat";
import { cn } from "@/lib/utils";

interface AgentButtonProps {
  agentType?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function AgentButton({
  agentType: explicitAgentType,
  variant = "outline",
  size = "default",
  className,
  children,
}: AgentButtonProps) {
  const { agentType: contextAgentType, moduleName } = useModuleContext();
  const { openChat } = useEmbeddedChat();

  const resolvedAgentType = explicitAgentType ?? contextAgentType;
  const label = moduleName ? `Ask ${moduleName} Agent` : "Ask Agent";

  if (!resolvedAgentType) return null;

  const variantClasses = {
    default:
      "bg-primary text-primary-foreground hover:bg-primary/90",
    outline:
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  const sizeClasses = {
    default: "h-9 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs",
    icon: "h-9 w-9",
  };

  return (
    <button
      onClick={() => openChat(resolvedAgentType)}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children ?? (
        <>
          <Sparkles className="w-4 h-4" />
          {size !== "icon" && label}
        </>
      )}
    </button>
  );
}
