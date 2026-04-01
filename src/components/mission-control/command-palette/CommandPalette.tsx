"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CommandItem } from "@/lib/mission-control/types";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  query: string;
  items: CommandItem[];
  onQueryChange: (q: string) => void;
  onSelect: (item: CommandItem) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  action: "Actions",
  agent: "Agents",
  chat: "Chats",
  artifact: "Artifacts",
};

export function CommandPalette({ open, query, items, onQueryChange, onSelect, onClose }: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && items[selectedIndex]) {
        e.preventDefault();
        onSelect(items[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [items, selectedIndex, onSelect, onClose],
  );

  if (!open) return null;

  // Group items by type
  const grouped = items.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.type] ??= []).push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
          <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chats, agents, actions..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
          />
          <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No results found</p>
          ) : (
            Object.entries(grouped).map(([type, groupItems]) => (
              <div key={type}>
                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                  {TYPE_LABELS[type] ?? type}
                </p>
                {groupItems.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                        idx === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800/50",
                      )}
                    >
                      {item.icon && <span className="text-base">{item.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-200">{item.title}</p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-gray-500">{item.subtitle}</p>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
