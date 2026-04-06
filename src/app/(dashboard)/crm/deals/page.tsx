"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { CrmNav } from "../CrmNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface DealEntry {
  id: string;
  key: string;
  value: {
    name: string;
    company?: string;
    value?: number;
    stage?: string;
    assignedTo?: string;
    closeDate?: string;
  };
  createdAt: string;
}

const STAGES = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

const STAGE_COLORS: Record<string, string> = {
  LEAD: "bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-secondary)]",
  QUALIFIED: "bg-blue-50 border-blue-300 text-blue-700",
  PROPOSAL: "bg-purple-50 border-purple-300 text-purple-700",
  NEGOTIATION: "bg-yellow-50 border-yellow-300 text-yellow-700",
  CLOSED_WON: "bg-emerald-50 border-emerald-300 text-emerald-700",
  CLOSED_LOST: "bg-red-50 border-red-300 text-red-700",
};

const STAGE_COLUMN_BG: Record<string, string> = {
  LEAD: "bg-[var(--bg-base)] border-[var(--border)]",
  QUALIFIED: "bg-blue-50/50 border-blue-200",
  PROPOSAL: "bg-purple-50/50 border-purple-200",
  NEGOTIATION: "bg-yellow-50/50 border-yellow-200",
  CLOSED_WON: "bg-emerald-50/50 border-emerald-200",
  CLOSED_LOST: "bg-red-50/50 border-red-200",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(amount);
}

function fmtStage(stage: string) {
  return stage.replace(/_/g, " ");
}

/* ------------------------------------------------------------------ */
/*  Add Deal Form                                                      */
/* ------------------------------------------------------------------ */
function AddDealForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState("LEAD");
  const [assignedTo, setAssignedTo] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Deal name is required.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/crm/deals", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || undefined,
          value: value ? parseFloat(value) : 0,
          stage,
          assignedTo: assignedTo.trim() || undefined,
          closeDate: closeDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErr(data?.error || `Failed: ${res.statusText}`);
        return;
      }
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Deal</h2>
        <button
          onClick={onCancel}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Deal Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deal name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Company
            </label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Value (AED)
            </label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {fmtStage(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Assigned To
            </label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Team member"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Close Date
            </label>
            <Input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Deal"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deal Card                                                          */
/* ------------------------------------------------------------------ */
function DealCard({ deal }: { deal: DealEntry }) {
  return (
    <div className="bg-[var(--bg-base)] rounded-lg p-3 shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate flex-1">
          {deal.key}
        </h4>
      </div>
      {deal.value.company && (
        <p className="text-xs text-[var(--text-secondary)] mb-2 truncate">
          {deal.value.company}
        </p>
      )}
      <p className="text-sm font-bold text-[var(--text-primary)] mb-2">
        {fmtCurrency(deal.value.value || 0)}
      </p>
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            STAGE_COLORS[deal.value.stage || "LEAD"]
          )}
        >
          {fmtStage(deal.value.stage || "LEAD")}
        </Badge>
        {deal.value.closeDate && (
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {new Date(deal.value.closeDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DealsPage() {
  const [deals, setDeals] = useState<DealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/crm/deals", { headers });
      if (res.ok) {
        setDeals((await res.json()).entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  async function handleDealDragEnd(result: DropResult) {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStage = destination.droppableId;

    // Optimistic update
    const prev = [...deals];
    setDeals((d) =>
      d.map((deal) => {
        if (deal.id !== draggableId) return deal;
        const parsed = typeof deal.value === "string" ? JSON.parse(deal.value) : deal.value;
        return { ...deal, value: { ...parsed, stage: newStage } };
      })
    );

    try {
      const deal = deals.find((d) => d.id === draggableId);
      if (!deal) return;
      const parsed = typeof deal.value === "string" ? JSON.parse(deal.value) : deal.value;
      const headers = await getAuthHeaders();
      await fetch("/api/v1/crm/deals", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed, stage: newStage, name: deal.key }),
      });
    } catch {
      setDeals(prev);
    }
  }

  const pipeline = useMemo(() => {
    const map: Record<string, DealEntry[]> = {};
    STAGES.forEach((s) => (map[s] = []));
    deals.forEach((d) => {
      const stage = d.value.stage || "LEAD";
      (map[stage] ??= []).push(d);
    });
    return map;
  }, [deals]);

  const totalPipeline = useMemo(() => {
    return deals
      .filter(
        (d) =>
          d.value.stage !== "CLOSED_WON" && d.value.stage !== "CLOSED_LOST"
      )
      .reduce((sum, d) => sum + (d.value.value || 0), 0);
  }, [deals]);

  return (
    <ModuleLayoutShell moduleType="CRM">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Deals</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Track your pipeline across stages.{" "}
              <span className="font-medium text-[var(--text-secondary)]">
                Pipeline: {fmtCurrency(totalPipeline)}
              </span>
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>New Deal</Button>
          )}
        </div>

        <CrmNav />

        {showForm && (
          <AddDealForm
            onCreated={() => {
              setShowForm(false);
              loadDeals();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((s) => (
              <div
                key={s}
                className="min-w-[220px] flex-1 rounded-xl border bg-[var(--bg-base)] p-3 animate-pulse"
              >
                <div className="h-4 w-20 bg-[var(--bg-surface)] rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-20 bg-[var(--bg-surface)] rounded-lg" />
                  <div className="h-20 bg-[var(--bg-surface)] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
              No deals yet
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Create your first deal to start tracking your pipeline.
            </p>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              Create Deal
            </Button>
          </div>
        ) : (
          /* Kanban Board */
          <DragDropContext onDragEnd={handleDealDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <Droppable droppableId={stage} key={stage}>
                {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "min-w-[220px] flex-1 rounded-xl border p-3 transition-colors",
                  STAGE_COLUMN_BG[stage],
                  snapshot.isDraggingOver && "ring-2 ring-[var(--accent)]"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {fmtStage(stage)}
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)] font-medium bg-[var(--bg-base)] rounded-full px-2 py-0.5">
                    {pipeline[stage]?.length ?? 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {(pipeline[stage] ?? []).map((deal, index) => (
                    <Draggable key={deal.id} draggableId={deal.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={dragSnapshot.isDragging ? "shadow-lg ring-2 ring-[var(--accent)] rounded-lg" : ""}
                        >
                          <DealCard deal={deal} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {(pipeline[stage] ?? []).length === 0 && (
                    <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                      No deals
                    </p>
                  )}
                </div>
              </div>
                )}
              </Droppable>
            ))}
          </div>
          </DragDropContext>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
