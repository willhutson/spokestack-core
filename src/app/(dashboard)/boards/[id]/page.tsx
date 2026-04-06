"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { cn } from "@/lib/utils";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

interface Card {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
}

interface BoardData {
  name: string;
  columns: string[];
}

interface ContextEntry {
  id: string;
  key: string;
  value: string;
}

const DEFAULT_COLUMNS = [
  { key: "TODO", label: "To Do", color: "bg-gray-400" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-400" },
  { key: "IN_REVIEW", label: "In Review", color: "bg-amber-400" },
  { key: "DONE", label: "Done", color: "bg-green-400" },
];

function priorityDot(priority?: string) {
  switch (priority?.toUpperCase()) {
    case "URGENT": return "bg-red-400";
    case "HIGH": return "bg-orange-400";
    case "MEDIUM": return "bg-yellow-400";
    case "LOW": return "bg-[var(--bg-hover)]";
    default: return "bg-[var(--bg-hover)]";
  }
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<BoardData | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const columns = board?.columns
    ? board.columns.map((col, i) => ({
        key: col.toUpperCase().replace(/\s+/g, "_"),
        label: col,
        color: ["bg-gray-400", "bg-blue-400", "bg-amber-400", "bg-green-400", "bg-purple-400"][i % 5],
      }))
    : DEFAULT_COLUMNS;

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [boardRes, tasksRes] = await Promise.all([
        fetch(`/api/v1/context?category=board&key=${boardId}`, { headers }),
        fetch("/api/v1/tasks", { headers }),
      ]);

      if (boardRes.ok) {
        const d = await boardRes.json();
        const entry = (d.entries ?? []).find((e: ContextEntry) => e.key === boardId);
        if (entry) {
          try {
            const v = JSON.parse(entry.value);
            setBoard({ name: v.name ?? boardId, columns: v.columns ?? [] });
          } catch {
            setBoard({ name: boardId, columns: [] });
          }
        } else {
          setBoard({ name: boardId, columns: [] });
        }
      } else {
        setBoard({ name: boardId, columns: [] });
      }

      if (tasksRes.ok) {
        const d = await tasksRes.json();
        const allTasks: Card[] = (d.tasks ?? [])
          .filter((t: Record<string, unknown>) => {
            const meta = t.metadata as Record<string, unknown> | undefined;
            return meta?.boardId === boardId || !meta?.boardId;
          })
          .map((t: Record<string, unknown>) => ({
            id: t.id as string,
            title: t.title as string,
            description: t.description as string | undefined,
            status: t.status as string,
            priority: t.priority as string | undefined,
            assigneeId: t.assigneeId as string | undefined,
            assigneeName: (t as Record<string, unknown>).assigneeName as string | undefined,
            dueDate: t.dueDate as string | undefined,
          }));
        setCards(allTasks);
      }
    } catch {
      setBoard({ name: boardId, columns: [] });
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  const addCard = async (columnKey: string) => {
    if (!newCardTitle.trim()) return;
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newCardTitle.trim(),
          status: columnKey,
          metadata: { boardId },
        }),
      });
      setNewCardTitle("");
      setAddingTo(null);
      load();
    } catch {
      // ignore
    }
  };

  const cardsByColumn = (colKey: string) => cards.filter((c) => c.status === colKey);

  async function handleBoardDragEnd(result: DropResult) {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;

    const prev = [...cards];
    setCards((c) => c.map((card) => card.id === draggableId ? { ...card, status: newStatus } : card));

    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/v1/tasks/${draggableId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setCards(prev);
    }
  }

  return (
    <ModuleLayoutShell moduleType="BOARDS">
      <div className="flex flex-col h-full bg-[var(--bg-base)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/boards")} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{board?.name ?? "Board"}</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[var(--text-tertiary)]">Loading board...</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleBoardDragEnd}>
          <div className="flex-1 overflow-x-auto p-6">
            <div className="flex gap-4 min-h-full" style={{ minWidth: `${columns.length * 280}px` }}>
              {columns.map((col) => {
                const colCards = cardsByColumn(col.key);
                return (
                  <Droppable droppableId={col.key} key={col.key}>
                    {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn("flex flex-col bg-[var(--bg-base)] rounded-xl border border-[var(--border)] w-72 flex-shrink-0 transition-colors", snapshot.isDraggingOver && "ring-2 ring-[var(--accent)]")}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full", col.color)} />
                        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{col.label}</h3>
                        <span className="text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-surface)] rounded-full px-2 py-0.5">
                          {colCards.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                      {colCards.length === 0 && addingTo !== col.key && (
                        <div className="flex items-center justify-center h-20 border-2 border-dashed border-[var(--border-strong)] rounded-lg">
                          <p className="text-xs text-[var(--text-tertiary)]">No items</p>
                        </div>
                      )}

                      {colCards.map((card, cardIndex) => (
                        <Draggable key={card.id} draggableId={card.id} index={cardIndex}>
                          {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={cn("bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--border-strong)] transition-colors cursor-grab", dragSnapshot.isDragging && "shadow-lg ring-2 ring-[var(--accent)]")}
                        >
                          <div className="flex items-start gap-2">
                            <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", priorityDot(card.priority))} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{card.title}</p>
                              {card.description && (
                                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{card.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {card.assigneeName && (
                                  <span className="w-5 h-5 rounded-full bg-[var(--accent-subtle)] text-[9px] font-semibold text-[var(--accent)] flex items-center justify-center">
                                    {getInitials(card.assigneeName)}
                                  </span>
                                )}
                                {card.dueDate && (
                                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                                    new Date(card.dueDate) < new Date() ? "bg-red-50 text-red-600" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                                  )}>
                                    {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Add Card Form */}
                      {addingTo === col.key && (
                        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-3">
                          <input
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") addCard(col.key); if (e.key === "Escape") { setAddingTo(null); setNewCardTitle(""); } }}
                            placeholder="Card title..."
                            autoFocus
                            className="w-full border border-[var(--border-strong)] rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-2"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => addCard(col.key)}
                              className="px-3 py-1 text-xs font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded hover:bg-[var(--accent)]">Add</button>
                            <button onClick={() => { setAddingTo(null); setNewCardTitle(""); }}
                              className="px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add Card Button */}
                    {addingTo !== col.key && (
                      <div className="px-3 pb-3">
                        <button onClick={() => { setAddingTo(col.key); setNewCardTitle(""); }}
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          Add Card
                        </button>
                      </div>
                    )}
                  </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </div>
          </DragDropContext>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
