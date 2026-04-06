"use client";

import { createClient } from "@/lib/supabase/client";

interface TaskActionsProps {
  task: { id: string; title: string; status: string; priority: string };
  onCanvasAdd?: () => void;
  onAskAgent?: (message: string) => void;
}

export default function TaskActions({
  task,
  onCanvasAdd,
  onAskAgent,
}: TaskActionsProps) {
  async function addToCanvas() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await fetch("/api/v1/mission-control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ autoGenerate: true }),
    });
    onCanvasAdd?.();
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={addToCanvas}
        title="Add to Mission Control Canvas"
        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3"
          />
        </svg>
      </button>
      <button
        onClick={() =>
          onAskAgent?.(`Tell me about task "${task.title}" [${task.status}]`)
        }
        title="Ask Agent about this task"
        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
      </button>
    </div>
  );
}
