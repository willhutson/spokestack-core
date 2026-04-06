"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface WfNode {
  id: string;
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  config?: Record<string, unknown>;
}

interface WfEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: Record<string, unknown>;
}

interface CanvasData {
  id: string;
  name: string;
  description?: string;
  nodes: WfNode[];
  edges: WfEdge[];
}

/* ------------------------------------------------------------------ */
/* Node palette items                                                  */
/* ------------------------------------------------------------------ */

const NODE_TYPES = [
  { type: "START", label: "Start", color: "bg-emerald-500" },
  { type: "ACTION", label: "Action", color: "bg-blue-500" },
  { type: "CONDITION", label: "Condition", color: "bg-amber-500" },
  { type: "DELAY", label: "Delay", color: "bg-purple-500" },
  { type: "APPROVAL", label: "Approval", color: "bg-pink-500" },
  { type: "NOTIFICATION", label: "Notification", color: "bg-cyan-500" },
  { type: "END", label: "End", color: "bg-gray-500" },
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toFlowNodes(nodes: WfNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "default",
    position: { x: n.positionX, y: n.positionY },
    data: { label: n.label, nodeType: n.type, config: n.config },
  }));
}

function toFlowEdges(edges: WfEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
  }));
}

function fromFlowNodes(nodes: Node[]): WfNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.data?.nodeType as string) ?? "ACTION",
    label: (n.data?.label as string) ?? "Node",
    positionX: n.position.x,
    positionY: n.position.y,
    config: (n.data?.config as Record<string, unknown>) ?? undefined,
  }));
}

function fromFlowEdges(edges: Edge[]): WfEdge[] {
  return edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    targetNodeId: e.target,
  }));
}

function generateId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function CanvasEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [canvasName, setCanvasName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  /* ---- Load canvas ---- */
  const loadCanvas = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/canvas/${id}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      const canvas: CanvasData = data.canvas;
      setCanvasName(canvas.name);
      setNodes(toFlowNodes(canvas.nodes));
      setEdges(toFlowEdges(canvas.edges));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id, setNodes, setEdges]);

  useEffect(() => {
    loadCanvas();
  }, [loadCanvas]);

  /* ---- onConnect ---- */
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  /* ---- Add node from palette ---- */
  function handleAddNode(type: string, label: string) {
    const newNode: Node = {
      id: generateId(),
      type: "default",
      position: {
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 300,
      },
      data: { label: `${label} Node`, nodeType: type, config: {} },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  /* ---- Save ---- */
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/canvas/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: canvasName,
          nodes: fromFlowNodes(nodes),
          edges: fromFlowEdges(edges),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Save failed" }));
        setSaveError(body.error || "Save failed");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Run ---- */
  async function handleRun() {
    setRunning(true);
    setRunStatus(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/canvas/${id}/run`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setRunStatus(`Run started: ${data.runId}`);
      } else {
        const body = await res.json().catch(() => ({ error: "Run failed" }));
        setRunStatus(body.error || "Run failed");
      }
    } catch {
      setRunStatus("Run failed");
    } finally {
      setRunning(false);
    }
  }

  /* ---- Delete node ---- */
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((n) => n.id));
      setEdges((eds) =>
        eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
      );
    },
    [setEdges]
  );

  if (loading) {
    return (
      <ModuleLayoutShell moduleType="WORKFLOWS">
        <div className="flex items-center justify-center h-screen">
          <p className="text-sm text-gray-400">Loading canvas...</p>
        </div>
      </ModuleLayoutShell>
    );
  }

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="flex flex-col h-screen">
        {/* ---- Top Bar ---- */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/canvas")}
              className="text-sm text-[var(--text-secondary)] hover:text-gray-700"
            >
              &larr; Back
            </button>
            <input
              type="text"
              value={canvasName}
              onChange={(e) => setCanvasName(e.target.value)}
              className="text-lg font-semibold text-[var(--text-primary)] bg-transparent border-none focus:outline-none focus:ring-0 w-64"
              placeholder="Canvas name"
            />
          </div>
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-xs text-red-600 mr-2">{saveError}</span>
            )}
            {runStatus && (
              <span className="text-xs text-emerald-600 mr-2">{runStatus}</span>
            )}
            <button
              onClick={handleRun}
              disabled={running || nodes.length === 0}
              className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {running ? "Running..." : "Run"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* ---- Canvas Area ---- */}
        <div className="flex flex-1 min-h-0">
          {/* Node Palette (left sidebar) */}
          <div className="w-48 bg-gray-50 border-r border-[var(--border)] p-3 shrink-0 overflow-y-auto">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
              Add Nodes
            </p>
            <div className="space-y-2">
              {NODE_TYPES.map((nt) => (
                <button
                  key={nt.type}
                  onClick={() => handleAddNode(nt.type, nt.label)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-[var(--border)] rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span
                    className={`w-3 h-3 rounded-full ${nt.color} shrink-0`}
                  />
                  {nt.label}
                </button>
              ))}
            </div>
          </div>

          {/* React Flow Canvas */}
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodesDelete={onNodesDelete}
              fitView
              deleteKeyCode="Delete"
            >
              <Background gap={16} size={1} />
              <Controls />
              <MiniMap
                nodeStrokeWidth={3}
                pannable
                zoomable
                style={{ width: 150, height: 100 }}
              />
            </ReactFlow>
          </div>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
