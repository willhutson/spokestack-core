"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { MC_API } from "@/lib/mission-control/constants";
import type { MCNotification } from "@/lib/mission-control/types";

const POLL_INTERVAL = 30_000; // 30 seconds

interface UseNotificationsReturn {
  notifications: MCNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<MCNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(MC_API.notifications, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${MC_API.notifications}/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    if (!res.ok) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(MC_API.notifications, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    if (!res.ok) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const dismissNotification = useCallback(async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${MC_API.notifications}/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    });
    if (!res.ok) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  };
}
