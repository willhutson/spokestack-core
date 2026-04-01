"use client";

import { cn } from "@/lib/utils";

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
      title="Notifications"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white",
            unreadCount > 9 ? "h-5 w-5" : "h-4 w-4",
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
