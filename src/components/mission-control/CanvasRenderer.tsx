"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import CanvasNode, { type CanvasNodeData } from "./CanvasNode";

export interface CanvasEdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

interface Props {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  width: number;
  height: number;
  onNodeClick?: (node: CanvasNodeData) => void;
}

export default function CanvasRenderer({
  nodes,
  edges,
  width,
  height,
  onNodeClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Pan via mouse drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-canvas-node]")) return;
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [dragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Zoom via wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(2, Math.max(0.3, prev - e.deltaY * 0.001)));
  }, []);

  // Build node position lookup for edge rendering
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-950 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgb(55 65 81) 1px, transparent 1px)",
          backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Canvas content */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width,
          height,
          position: "relative",
        }}
      >
        {/* SVG edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
        >
          {edges.map((edge) => {
            const source = nodeMap.get(edge.sourceId);
            const target = nodeMap.get(edge.targetId);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                x1={source.positionX}
                y1={source.positionY}
                x2={target.positionX}
                y2={target.positionY}
                stroke="rgb(55 65 81)"
                strokeWidth={1.5}
                strokeOpacity={0.5}
                strokeDasharray="4 4"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div key={node.id} data-canvas-node>
            <CanvasNode
              node={node}
              selected={selectedNodeId === node.id}
              onClick={() => {
                setSelectedNodeId(node.id);
                onNodeClick?.(node);
              }}
            />
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-gray-900 rounded-lg border border-gray-800 p-1">
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm"
        >
          +
        </button>
        <span className="text-[10px] text-gray-500 px-1 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm"
        >
          -
        </button>
      </div>
    </div>
  );
}
