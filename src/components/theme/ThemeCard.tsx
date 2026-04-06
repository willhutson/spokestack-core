"use client";

import { ThemeMiniPreview } from "./ThemeMiniPreview";
import { THEME_META, type ThemeName } from "./ThemeProvider";

interface ThemeCardProps {
  theme: ThemeName;
  isActive: boolean;
  onSelect: (theme: ThemeName) => void;
  onHover: (theme: ThemeName) => void;
  onLeave: () => void;
}

export function ThemeCard({ theme, isActive, onSelect, onHover, onLeave }: ThemeCardProps) {
  const meta = THEME_META[theme];

  return (
    <button
      onClick={() => onSelect(theme)}
      onMouseEnter={() => onHover(theme)}
      onMouseLeave={onLeave}
      className="text-left transition-all"
      style={{
        width: 264,
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        border: isActive ? "2px solid var(--accent)" : "2px solid transparent",
        overflow: "hidden",
        backgroundColor: "var(--bg-surface)",
        boxShadow: isActive ? "0 0 0 4px var(--accent-subtle)" : "none",
      }}
    >
      <ThemeMiniPreview theme={theme} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          borderTop: "1px solid var(--border-neutral)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          >
            {meta.label}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-body)",
            }}
          >
            {meta.description}
          </span>
        </div>
        {isActive && (
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: "var(--accent)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "var(--primary-foreground, #fff)",
              fontWeight: 700,
            }}
          >
            ✓
          </div>
        )}
      </div>
    </button>
  );
}
