"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName = "obsidian" | "volt" | "indigo" | "canvas" | "monolith" | "copper" | "sage";

export const VALID_THEMES: ThemeName[] = [
  "obsidian", "volt", "indigo", "canvas", "monolith", "copper", "sage",
];

export const THEME_META: Record<ThemeName, { label: string; description: string; font: string | null; googleFont: string | null }> = {
  obsidian: { label: "Obsidian", description: "Dark, engineered precision", font: null, googleFont: null },
  volt:     { label: "Volt", description: "Electric, kinetic energy", font: "Space Grotesk", googleFont: "Space+Grotesk:wght@400;500;700" },
  indigo:   { label: "Indigo", description: "Deep navy, authoritative", font: "Fraunces", googleFont: "Fraunces:opsz,wght@9..144,400;9..144,700" },
  canvas:   { label: "Canvas", description: "Warm minimal, editorial", font: "Lora", googleFont: "Lora:wght@400;500;600;700" },
  monolith: { label: "Monolith", description: "Stark, architectural", font: "Geist", googleFont: null }, // Geist via next/font
  copper:   { label: "Copper", description: "Warm luxury, premium", font: "Cormorant Garamond", googleFont: "Cormorant+Garamond:wght@400;500;600" },
  sage:     { label: "Sage", description: "Earthy, editorial calm", font: "DM Serif Display", googleFont: "DM+Serif+Display&family=DM+Sans:wght@400;500;600" },
};

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  previewTheme: (theme: ThemeName | null) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "obsidian",
  setTheme: () => {},
  previewTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({
  initialTheme = "obsidian",
  children,
}: {
  initialTheme?: ThemeName;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);
  const [preview, setPreview] = useState<ThemeName | null>(null);

  const activeTheme = preview ?? theme;

  // Apply data-theme to the closest wrapper
  useEffect(() => {
    const el = document.getElementById("theme-root");
    if (el) {
      el.setAttribute("data-theme", activeTheme);
    }
  }, [activeTheme]);

  // Load Google Font for the active theme
  useEffect(() => {
    const meta = THEME_META[activeTheme];
    if (!meta.googleFont) return;

    const id = `theme-font-${activeTheme}`;
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${meta.googleFont}&display=swap`;
    document.head.appendChild(link);
  }, [activeTheme]);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    setPreview(null);
  };

  const previewTheme = (t: ThemeName | null) => {
    setPreview(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, previewTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
