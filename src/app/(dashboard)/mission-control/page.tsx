"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import CanvasRenderer, {
  type CanvasEdgeData,
} from "@/components/mission-control/CanvasRenderer";
import { type CanvasNodeData } from "@/components/mission-control/CanvasNode";
import ActivityFeed from "@/components/mission-control/ActivityFeed";
import MissionControlHeader from "@/components/mission-control/MissionControlHeader";

interface CanvasData {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  width: number;
  height: number;
}

interface ActivityItem {
  id: string;
  agentType: string;
  action: string;
  content: string;
  toolCalls: string[];
  timestamp: string;
}

export default function MissionControlPage() {
  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedNode, setSelectedNode] = useState<CanvasNodeData | null>(null);
  const [activityOpen, setActivityOpen] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        loadData(session.access_token);
      }
    });
  }, []);

  async function loadData(accessToken: string) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    try {
      const [canvasRes, activityRes] = await Promise.all([
        fetch("/api/v1/mission-control", { headers }).then((r) => r.json()),
        fetch("/api/v1/mission-control/activity", { headers }).then((r) =>
          r.json()
        ),
      ]);
      setCanvas(canvasRes.canvas ?? null);
      setActivity(activityRes.activity ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!token) return;
    setRegenerating(true);
    try {
      await fetch("/api/v1/mission-control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      await loadData(token);
    } finally {
      setRegenerating(false);
    }
  }

  // Apply filters
  const filteredNodes = canvas
    ? canvas.nodes.filter((n) => {
        if (filterStatus !== "all" && n.status !== filterStatus) return false;
        if (filterType !== "all" && n.entityType !== filterType) return false;
        return true;
      })
    : [];

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = canvas
    ? canvas.edges.filter(
        (e) =>
          filteredNodeIds.has(e.sourceId) && filteredNodeIds.has(e.targetId)
      )
    : [];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-sm text-gray-400">
            Loading Mission Control...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <MissionControlHeader
        nodeCount={filteredNodes.length}
        edgeCount={filteredEdges.length}
        filterStatus={filterStatus}
        filterType={filterType}
        onFilterStatusChange={setFilterStatus}
        onFilterTypeChange={setFilterType}
        onRegenerate={handleRegenerate}
        regenerating={regenerating}
      />

      <div className="flex-1 flex min-h-0">
        {/* Canvas area */}
        <div className="flex-1 relative">
          {canvas && filteredNodes.length > 0 ? (
            <CanvasRenderer
              nodes={filteredNodes}
              edges={filteredEdges}
              width={canvas.width}
              height={canvas.height}
              onNodeClick={(node) => setSelectedNode(node)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-950">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  No canvas data yet. Create some tasks or projects first.
                </p>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {regenerating ? "Generating..." : "Generate Canvas"}
                </button>
              </div>
            </div>
          )}

          {/* Node detail panel */}
          {selectedNode && (
            <div className="absolute top-4 right-4 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {selectedNode.entityType}
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {selectedNode.label}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {selectedNode.status.replace(/_/g, " ")}
                  </span>
                  {selectedNode.priority && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {selectedNode.priority}
                    </span>
                  )}
                </div>
                {selectedNode.metadata?.dueDate ? (
                  <p className="text-xs text-gray-500">
                    Due:{" "}
                    {new Date(
                      selectedNode.metadata.dueDate as string
                    ).toLocaleDateString()}
                  </p>
                ) : null}
                {selectedNode.metadata?.customerName ? (
                  <p className="text-xs text-gray-500">
                    Customer: {String(selectedNode.metadata.customerName)}
                  </p>
                ) : null}
                {selectedNode.metadata?.clientName ? (
                  <p className="text-xs text-gray-500">
                    Client: {String(selectedNode.metadata.clientName)}
                  </p>
                ) : null}
                {selectedNode.entityType === "PROJECT" &&
                  selectedNode.metadata?.phaseCount ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Progress:{" "}
                        {selectedNode.metadata.completedPhases as number}/
                        {selectedNode.metadata.phaseCount as number} phases
                      </p>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${((selectedNode.metadata.completedPhases as number) / (selectedNode.metadata.phaseCount as number)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Activity feed sidebar */}
        {activityOpen && (
          <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
            <div className="h-10 px-4 flex items-center justify-between border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </span>
              <button
                onClick={() => setActivityOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ActivityFeed activity={activity} />
            </div>
          </div>
        )}

        {/* Activity toggle when closed */}
        {!activityOpen && (
          <button
            onClick={() => setActivityOpen(true)}
            className="absolute right-4 top-20 bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:bg-gray-50 z-10"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
