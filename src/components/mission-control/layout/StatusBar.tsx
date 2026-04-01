"use client";

interface StatusBarProps {
  connectedAgents: number;
  lastMessageTime?: string | Date | null;
}

export function StatusBar({ connectedAgents, lastMessageTime }: StatusBarProps) {
  const formatted = lastMessageTime
    ? new Date(lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex items-center justify-between border-t border-gray-800 bg-gray-950 px-4 py-1.5 text-[11px] text-gray-500">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {connectedAgents} agent{connectedAgents !== 1 ? "s" : ""} available
        </span>
        {formatted && <span>Last message: {formatted}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span><kbd className="rounded border border-gray-700 px-1">⌘K</kbd> Command</span>
        <span><kbd className="rounded border border-gray-700 px-1">⌘B</kbd> Sidebar</span>
      </div>
    </div>
  );
}
