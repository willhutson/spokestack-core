"use client";

import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  id: string;
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export const MC_SHORTCUTS = {
  NEW_CHAT: { key: "n", meta: true, description: "New chat" },
  TOGGLE_SIDEBAR: { key: "b", meta: true, description: "Toggle sidebar" },
  COMMAND_PALETTE: { key: "k", meta: true, description: "Command palette" },
  CLOSE: { key: "Escape", description: "Close" },
} as const;

/**
 * Format a shortcut for display (e.g. "Cmd+N" or "Ctrl+N").
 */
export function formatShortcut(shortcut: {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}): string {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.userAgent);

  const parts: string[] = [];
  if (shortcut.meta) parts.push(isMac ? "Cmd" : "Ctrl");
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push(isMac ? "Option" : "Alt");

  const keyLabel =
    shortcut.key === "Escape"
      ? "Esc"
      : shortcut.key.length === 1
        ? shortcut.key.toUpperCase()
        : shortcut.key;
  parts.push(keyLabel);

  return parts.join("+");
}

interface UseKeyboardShortcutsOptions {
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  onCommandPalette?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}

/**
 * Registers Mission Control keyboard shortcuts.
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions
): void {
  const {
    onNewChat,
    onToggleSidebar,
    onCommandPalette,
    onClose,
    enabled = true,
  } = options;

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when typing in inputs unless it's Escape
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      if (isInput) return;

      const metaOrCtrl = e.metaKey || e.ctrlKey;

      if (metaOrCtrl && e.key === "n") {
        e.preventDefault();
        onNewChat?.();
      } else if (metaOrCtrl && e.key === "b") {
        e.preventDefault();
        onToggleSidebar?.();
      } else if (metaOrCtrl && e.key === "k") {
        e.preventDefault();
        onCommandPalette?.();
      }
    },
    [enabled, onNewChat, onToggleSidebar, onCommandPalette, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
