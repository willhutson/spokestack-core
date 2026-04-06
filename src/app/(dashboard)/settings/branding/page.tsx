"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { useTheme, VALID_THEMES, type ThemeName } from "@/components/theme/ThemeProvider";

export default function BrandingSettingsPage() {
  const { theme: currentTheme, setTheme, previewTheme } = useTheme();
  const [savedTheme, setSavedTheme] = useState<ThemeName>(currentTheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSavedTheme(currentTheme);
  }, [currentTheme]);

  const handleSelect = async (theme: ThemeName) => {
    setSaving(true);
    setSavedTheme(theme);
    setTheme(theme);

    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/settings/branding", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
    } catch (err) {
      console.error("Failed to save theme:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleHover = (theme: ThemeName) => {
    previewTheme(theme);
  };

  const handleLeave = () => {
    previewTheme(null);
  };

  return (
    <div
      style={{
        padding: "40px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        maxWidth: 1200,
      }}
    >
      {/* Page heading */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 22,
            fontWeight: "var(--weight-heading)" as any,
            color: "var(--text-primary)",
            letterSpacing: "var(--tracking-heading)",
            margin: 0,
          }}
        >
          Theme
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Choose how your workspace looks. The theme applies to every member in
          this organization.
        </p>
      </div>

      {/* Theme grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {VALID_THEMES.map((t) => (
          <ThemeCard
            key={t}
            theme={t}
            isActive={savedTheme === t}
            onSelect={handleSelect}
            onHover={handleHover}
            onLeave={handleLeave}
          />
        ))}
      </div>

      {/* Helper text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 4,
            height: 4,
            backgroundColor: "var(--text-tertiary)",
            borderRadius: "50%",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "var(--text-tertiary)",
            lineHeight: 1.4,
          }}
        >
          Hover any card to preview it live across the app. Your choice applies
          to every member in this workspace.
          {saving && " Saving..."}
        </span>
      </div>
    </div>
  );
}
