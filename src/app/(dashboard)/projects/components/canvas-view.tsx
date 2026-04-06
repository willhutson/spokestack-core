"use client";

import { useRef, useEffect } from "react";

interface CanvasNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type?: string;
}

interface CanvasEdge {
  from: string;
  to: string;
  label?: string;
}

interface CanvasViewProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;

const NODE_TYPE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  start: { bg: "bg-green-50", border: "border-green-300", text: "text-green-800" },
  end: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800" },
  decision: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800" },
  process: { bg: "bg-[var(--bg-base)]", border: "border-[var(--border-strong)]", text: "text-[var(--text-primary)]" },
  default: { bg: "bg-[var(--bg-base)]", border: "border-[var(--border-strong)]", text: "text-[var(--text-primary)]" },
};

export default function CanvasView({ nodes, edges }: CanvasViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate SVG viewBox
  const padding = 40;
  const maxX = nodes.length > 0 ? Math.max(...nodes.map((n) => n.x + NODE_WIDTH)) + padding : 800;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.y + NODE_HEIGHT)) + padding : 400;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  useEffect(() => {
    // Read-only canvas — no interaction handlers needed
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No workflow canvas</h3>
        <p className="text-xs text-[var(--text-secondary)]">This project doesn&apos;t have a workflow diagram yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Workflow Canvas</h3>
        <span className="text-xs text-[var(--text-tertiary)]">Read-only view</span>
      </div>
      <div className="overflow-auto" style={{ maxHeight: "600px" }}>
        <div className="relative" style={{ width: maxX + padding, height: maxY + padding }}>
          {/* SVG layer for edges */}
          <svg
            ref={svgRef}
            className="absolute inset-0"
            width={maxX + padding}
            height={maxY + padding}
            style={{ pointerEvents: "none" }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#9CA3AF" />
              </marker>
            </defs>
            {edges.map((edge, i) => {
              const fromNode = nodeMap.get(edge.from);
              const toNode = nodeMap.get(edge.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + NODE_WIDTH / 2;
              const y1 = fromNode.y + NODE_HEIGHT;
              const x2 = toNode.x + NODE_WIDTH / 2;
              const y2 = toNode.y;

              // Curved path
              const midY = (y1 + y2) / 2;

              return (
                <g key={`edge-${i}`}>
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#D1D5DB"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                  {edge.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={midY - 6}
                      textAnchor="middle"
                      className="text-[10px] fill-gray-400"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Node divs */}
          {nodes.map((node) => {
            const styles = NODE_TYPE_STYLES[node.type ?? "default"] ?? NODE_TYPE_STYLES.default;
            return (
              <div
                key={node.id}
                className={`absolute border rounded-lg px-3 py-2 flex items-center justify-center text-center shadow-sm ${styles.bg} ${styles.border}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
              >
                <span className={`text-xs font-medium ${styles.text} line-clamp-2`}>
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
