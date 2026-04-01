"use client";

import { useState } from "react";
import type { MCChat } from "@/lib/mission-control/types";
import { AGENTS } from "@/lib/mission-control/constants";
import { cn } from "@/lib/utils";

interface ChatCardProps {
  chat: MCChat;
  active: boolean;
  onClick: () => void;
  onRename: (id: string, title: string) => void;
  onArchive: (id: string) => void;
}

function timeAgo(date: string | Date) {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ChatCard({ chat, active, onClick, onRename, onArchive }: ChatCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const agent = AGENTS[chat.agentType];

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        active ? "bg-gray-800" : "hover:bg-gray-800/50",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
          agent ? `bg-gradient-to-br ${agent.color}` : "bg-gray-700",
        )}
      >
        {agent?.icon ?? "💬"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-200">{chat.title}</p>
        <p className="text-xs text-gray-500">
          {timeAgo(chat.lastActivityAt ?? chat.updatedAt ?? chat.createdAt)}
        </p>
      </div>

      {/* Dropdown trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="invisible absolute right-2 top-2 rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-300 group-hover:visible"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-2 top-8 z-20 w-36 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-lg">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const title = prompt("Rename chat:", chat.title);
              if (title) onRename(chat.id, title);
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-800"
          >
            Rename
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(chat.id);
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-800"
          >
            Archive
          </button>
        </div>
      )}
    </div>
  );
}
