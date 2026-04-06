"use client";

import type { ThemeName } from "./ThemeProvider";

const PREVIEWS: Record<ThemeName, { bg: string; surface: string; accent: string; text: string; textMuted: string; border: string; radius: number }> = {
  obsidian:  { bg: "#0f1011", surface: "#191a1b", accent: "#7170ff", text: "#f7f8f8", textMuted: "#8a8f98", border: "rgba(255,255,255,0.06)", radius: 8 },
  volt:      { bg: "#0a0a0a", surface: "#121212", accent: "#00E5A0", text: "#ffffff", textMuted: "#888888", border: "rgba(0,229,160,0.12)", radius: 4 },
  indigo:    { bg: "#0e0e2e", surface: "#161640", accent: "#6C63FF", text: "#f0f0ff", textMuted: "#9999cc", border: "rgba(255,255,255,0.08)", radius: 12 },
  canvas:    { bg: "#faf9f7", surface: "#f4f2ef", accent: "#0075de", text: "rgba(0,0,0,0.85)", textMuted: "#615d59", border: "rgba(0,0,0,0.08)", radius: 8 },
  monolith:  { bg: "#ffffff", surface: "#f5f5f5", accent: "#171717", text: "#171717", textMuted: "#737373", border: "rgba(0,0,0,0.06)", radius: 6 },
  copper:    { bg: "#120e0a", surface: "#1c1610", accent: "#C47A2B", text: "#f5ede0", textMuted: "#a08060", border: "rgba(196,122,43,0.15)", radius: 10 },
  sage:      { bg: "#f4f6f2", surface: "#eceee8", accent: "#3a6b35", text: "#1a2414", textMuted: "#5a6b52", border: "rgba(58,107,53,0.12)", radius: 12 },
};

export function ThemeMiniPreview({ theme }: { theme: ThemeName }) {
  const p = PREVIEWS[theme];

  return (
    <div
      style={{
        width: "100%",
        height: 140,
        backgroundColor: p.bg,
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* Mini sidebar */}
      <div
        style={{
          width: 48,
          backgroundColor: p.surface,
          display: "flex",
          flexDirection: "column",
          padding: "10px 6px",
          gap: 4,
          borderRight: `1px solid ${p.border}`,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            backgroundColor: p.accent,
            borderRadius: Math.min(p.radius, 4),
          }}
        />
        <div style={{ height: 1, backgroundColor: p.border, margin: "4px 0" }} />
        <div style={{ width: 28, height: 4, backgroundColor: p.textMuted, opacity: 0.3, borderRadius: 2 }} />
        <div style={{ width: 22, height: 4, backgroundColor: p.textMuted, opacity: 0.2, borderRadius: 2 }} />
        <div style={{ width: 18, height: 4, backgroundColor: p.textMuted, opacity: 0.15, borderRadius: 2 }} />
      </div>

      {/* Mini content */}
      <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: 56, height: 5, backgroundColor: p.text, opacity: 0.6, borderRadius: 2 }} />
        <div style={{ width: 90, height: 3, backgroundColor: p.textMuted, opacity: 0.3, borderRadius: 2 }} />
        <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
          <div
            style={{
              flex: 1,
              height: 36,
              backgroundColor: p.surface,
              borderRadius: Math.min(p.radius, 6),
              border: `1px solid ${p.border}`,
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div style={{ width: 40, height: 3, backgroundColor: p.text, opacity: 0.25, borderRadius: 2 }} />
            <div style={{ width: 28, height: 3, backgroundColor: p.textMuted, opacity: 0.15, borderRadius: 2 }} />
          </div>
          <div
            style={{
              flex: 1,
              height: 36,
              backgroundColor: p.surface,
              borderRadius: Math.min(p.radius, 6),
              border: `1px solid ${p.border}`,
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div style={{ width: 36, height: 3, backgroundColor: p.text, opacity: 0.25, borderRadius: 2 }} />
            <div style={{ width: 24, height: 3, backgroundColor: p.textMuted, opacity: 0.15, borderRadius: 2 }} />
          </div>
        </div>
        <div
          style={{
            width: 36,
            height: 12,
            backgroundColor: p.accent,
            borderRadius: Math.min(p.radius, 4),
            marginTop: 4,
          }}
        />
      </div>
    </div>
  );
}
