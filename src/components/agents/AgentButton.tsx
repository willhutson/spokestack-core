"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { AgentChat } from "./AgentChat";
import { useModuleContext } from "@/hooks/useModuleContext";
import { cn } from "@/lib/utils";

interface AgentButtonProps {
  agentType?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
  initialMessage?: string;
  onComplete?: (
    messages: { role: "user" | "agent"; content: string }[]
  ) => void;
  children?: React.ReactNode;
}

export function AgentButton({
  agentType: explicitAgentType,
  variant = "outline",
  size = "default",
  className,
  initialMessage,
  onComplete,
  children,
}: AgentButtonProps) {
  const [open, setOpen] = useState(false);
  const { agentType: contextAgentType, moduleName } = useModuleContext();

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
    <>
      <button
        onClick={() => setOpen(true)}
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl h-[600px] bg-background rounded-xl border shadow-lg flex flex-col overflow-hidden z-10">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {label}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AgentChat
                agentType={resolvedAgentType}
                initialMessage={initialMessage}
                onComplete={(msgs) => {
                  onComplete?.(msgs);
                  setOpen(false);
                }}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
