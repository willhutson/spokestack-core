# SpokeStack — DESIGN.md

**Theme: Monolith**
**Version:** 1.0 — April 2026

> Stark, architectural, compressed. Black is the accent. Built for SaaS companies, developer tools, and product teams that worship the grid.

---

## 1. Visual Theme & Atmosphere

Pure white ground. Black type. No decoration. Monolith strips the interface to structural elements: borders-as-shadows, compressed tracking, and surgical use of neutral gray. The accent color IS black — there is no hue, no personality color, just the architecture of information. Geist headings compress like steel beams. Every pixel earns its place or gets cut.

**Mood:** An architect's blueprint pinned to a white wall. The grid is visible. The structure is the design. Nothing hides.

**Reference points:** Vercel's dashboard, Linear's light mode, Stripe's documentation, Rauno Freiberg's interfaces.

---

## 2. Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#ffffff` | Page background — pure white |
| `--bg-surface` | `#f5f5f5` | Cards, panels, sidebar — barely gray |
| `--bg-elevated` | `#ffffff` | Dropdowns, modals — white lifts via shadow-border |
| `--bg-hover` | `#ebebeb` | Hover on interactive surfaces |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#171717` | Headings, primary content — near-black |
| `--text-secondary` | `#737373` | Body text, descriptions, labels |
| `--text-tertiary` | `#a3a3a3` | Placeholders, timestamps, disabled |

### Accent — Black (Architecture)
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#171717` | Primary action, CTA — black IS the accent |
| `--accent-hover` | `#262626` | Hover — slightly lighter |
| `--accent-subtle` | `rgba(23,23,23,0.06)` | Tinted backgrounds, active nav bg |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(0,0,0,0.08)` | Subtle dividers, card edges |
| `--border-strong` | `rgba(0,0,0,0.15)` | Visible borders, input outlines |

### Semantic Colors
| Purpose | Hex | Usage |
|---------|-----|-------|
| Success | `#22c55e` | Completed, deployed, healthy |
| Warning | `#eab308` | Pending, building, queued |
| Error | `#ef4444` | Failed, error, down |
| Info | `#3b82f6` | Links in context — the ONLY hue users see regularly |

### Structure
| Token | Value |
|-------|-------|
| `--radius` | `6px` — tight, precise, architectural |
| `--shadow` | `0 0 0 1px rgba(0,0,0,0.06)` — shadow-as-border, Vercel style |

---

## 3. Typography

### Font Stack
```
--font-heading: 'Geist', system-ui, -apple-system, sans-serif
--font-body:    'Geist', system-ui, -apple-system, sans-serif
--font-mono:    'Geist Mono', 'Berkeley Mono', 'Fira Code', monospace
```

**One font family, three cuts.** Geist for everything — headings, body, and mono. The family was designed as a system. Mixing in other typefaces breaks the architectural unity. Hierarchy comes from weight, tracking, and size — never from font-family changes.

### Type Scale
| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Page title | Geist | 20–22px | 600 | -0.05em |
| Section heading | Geist | 14px | 600 | -0.03em |
| Body | Geist | 13px | 400 | -0.01em |
| Small body | Geist | 12px | 400 | -0.01em |
| Caption | Geist | 11px | 400 | normal |
| Overline | Geist | 10px | 500 | 0.06em, uppercase |
| Mono | Geist Mono | 13px | 400 | normal |
| CTA button | Geist | 13px | 500 | -0.01em |

### Key Rules
- **Tracking is aggressively compressed.** -0.05em on page titles. -0.03em on section heads. Even body gets -0.01em. This compression IS the Monolith identity.
- **Weight ceiling is 600.** No 700, no bold. Monolith uses semibold as its maximum. Heavy weight conflicts with the compressed tracking.
- **Geist only.** Do not introduce Inter, Lora, or any other typeface. The single-family constraint forces design discipline.
- **Body at 13px.** Like Obsidian, Monolith runs dense. But the white background makes 13px feel more readable than in dark themes.

---

## 4. Component Styling

### Cards / Surface Panels
```css
background: #f5f5f5;
border: none;
border-radius: 6px;
padding: 14px 16px;
box-shadow: 0 0 0 1px rgba(0,0,0,0.06);  /* shadow-as-border */
```

### Cards on White Background
```css
background: #ffffff;
border-radius: 6px;
padding: 14px 16px;
box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
/* No bg difference — the ring-shadow creates the boundary */
```

### Primary Button
```css
background: #171717;
color: #ffffff;
border-radius: 6px;
padding: 6px 14px;
font-family: 'Geist';
font-weight: 500;
font-size: 13px;
letter-spacing: -0.01em;
```

### Secondary / Ghost Button
```css
background: #ffffff;
border: none;
box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
color: #171717;
border-radius: 6px;
padding: 6px 14px;
```

### Destructive Button
```css
background: #ef4444;
color: #ffffff;
border-radius: 6px;
padding: 6px 14px;
/* Only place red appears as a background */
```

### Status Badges
```css
padding: 2px 8px;
border-radius: 999px;              /* pill shape — Vercel convention */
font-size: 11px;
font-weight: 500;

/* ACTIVE */    background: rgba(34,197,94,0.10);  color: #22c55e;
/* BUILDING */  background: rgba(234,179,8,0.10);  color: #ca8a04;
/* ERROR */     background: rgba(239,68,68,0.10);  color: #ef4444;
/* INACTIVE */  background: rgba(0,0,0,0.04);       color: #a3a3a3;
```

### Status Dot (Vercel-style)
```css
width: 6px; height: 6px;
border-radius: 50%;
/* Green: #22c55e, Yellow: #eab308, Red: #ef4444, Gray: #a3a3a3 */
/* Used inline next to status text. No animation. */
```

### Navigation — Active Item
```css
background: rgba(23,23,23,0.06);
color: #171717;
font-weight: 500;
border-radius: 6px;
padding: 6px 10px;
/* Active indicator: 2px-wide black bar left edge */
```

### Agent Chat Bubbles
```css
/* Agent */
background: #f5f5f5;
border-radius: 4px 6px 6px 6px;
box-shadow: 0 0 0 1px rgba(0,0,0,0.06);

/* User */
background: #171717;
color: #ffffff;
border-radius: 6px 4px 6px 6px;
/* Black on white — stark, intentional */
```

### Data Table Row
```css
border-bottom: 1px solid rgba(0,0,0,0.06);
padding: 10px 16px;
font-size: 13px;
/* Header row: font-weight 500, text-secondary color */
/* Hover: bg #f5f5f5 */
/* Selected: bg rgba(23,23,23,0.04) */
```

### Deployment Card (SaaS-specific)
```css
background: #ffffff;
border-radius: 6px;
box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
padding: 14px 16px;
/* Status dot + domain in Geist 13px 500 */
/* Commit hash in Geist Mono 11px #a3a3a3 */
/* Timestamp: relative ("2m ago") in 11px #a3a3a3 */
/* Branch label: Geist Mono 11px on bg rgba(0,0,0,0.04), 4px radius */
```

---

## 5. Layout & Spacing

### Page Structure
```
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │ Main Content           │ Agent Panel  │
│ 220px    │ flex: 1                │ 340px        │
│ (or 48px │ padding: 24px          │ (collapsible)│
│ compact) │                        │              │
└──────────┴────────────────────────┴──────────────┘
```

- **Sidebar:** 220px full (slightly narrower — Monolith wastes nothing), 48px compact. Background: `--bg-base` (#ffffff) with right border.
- **Main content:** Flexible. Padding: 24px uniform. No extra horizontal padding — Monolith is grid-strict.
- **Agent Panel:** 340px. Right-docked. Border-left only, same bg.
- **Top bar:** 48px height (shorter than other themes). Border-bottom: `--border`.

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| `gap-xs` | 4px | Inline elements, icon + text |
| `gap-sm` | 8px | Related items, badge groups |
| `gap-md` | 12px | Card spacing, form fields |
| `gap-lg` | 16px | Section spacing, grid gaps |
| `gap-xl` | 24px | Major section breaks |
| `gap-2xl` | 32px | Page-level section gaps |

### Card Grid
- Data tables: Full-width, no gap (border-bottom separators).
- Stat cards: Equal flex, 1px gap (shadow-borders touch).
- Deployment cards: Full-width list, 8px gap.

---

## 6. Depth & Shadows

Monolith replaces traditional shadows with ring-shadows (outline borders). This is the core visual principle.

```css
/* Card at rest — ring-shadow, NOT box-shadow */
box-shadow: 0 0 0 1px rgba(0,0,0,0.06);

/* Elevated surface (modals, dropdowns) */
box-shadow: 0 0 0 1px rgba(0,0,0,0.06),
            0 4px 12px rgba(0,0,0,0.05);

/* Card hover — ring intensifies */
box-shadow: 0 0 0 1px rgba(0,0,0,0.12);

/* Active/focused element */
box-shadow: 0 0 0 1px #171717,
            0 0 0 4px rgba(23,23,23,0.10);

/* Input focus */
box-shadow: 0 0 0 1px #171717;

/* NEVER use spread shadows without ring base */
```

---

## 7. Design Guardrails

### Do
- Use ring-shadows (`0 0 0 1px`) instead of borders. This is the Monolith signature. Cards never use `border:` — they use `box-shadow: 0 0 0 1px`.
- Keep radius at 6px maximum. Badges can use `999px` (pill). Nothing else exceeds 6px.
- Compress all heading tracking. -0.05em minimum at 18px+. If headings look comfortable, they're too loose.
- Use Geist exclusively. One family, three cuts (sans, sans semibold, mono). Introducing a second font destroys the architectural unity.
- Use black (#171717) as the accent. No hue. When you need color, it's semantic only (green/yellow/red for status).
- Let whitespace do the heavy lifting. Monolith's white background IS the design. Elements float in the void.

### Don't
- Don't add color accents. No blue primary, no indigo, no mint. Black is the accent. Hue means status or error.
- Don't use rounded corners above 6px. 8px is Canvas. 12px is Indigo. Monolith is sharp.
- Don't use traditional shadows (`0 4px 12px`) without a ring-shadow base. Every shadow starts with `0 0 0 1px`.
- Don't use bold (700) anywhere. Semibold (600) is the ceiling. Compressed tracking + bold = visual noise.
- Don't decorate. No gradients, no glows, no colored backgrounds. If you're adding visual interest, you're working against the theme.
- Don't use serif fonts. Monolith is post-typographic — Geist is the only voice.
- Don't differentiate surfaces with background color alone. Use ring-shadows. On Monolith, #ffffff and #f5f5f5 are the only two backgrounds.

---

## 8. Responsive Behavior

| Breakpoint | Sidebar | Agent Panel | Layout |
|------------|---------|-------------|--------|
| > 1280px | Full (220px) | Open (340px) | 3-column |
| 1024–1280px | Compact (48px) | Open (340px) | 2-column + panel |
| 768–1024px | Compact (48px) | Collapsed (toggle) | 2-column |
| < 768px | Hidden (drawer) | Full-screen overlay | 1-column |

On mobile, the Agent Panel becomes a full-screen overlay triggered by a floating button (bottom-right, #171717, 44px circle, ring-shadow):
```css
box-shadow: 0 0 0 1px rgba(0,0,0,0.06),
            0 4px 12px rgba(0,0,0,0.08);
```
No pulse animation. Monolith doesn't animate decoratively.

---

## 9. AI Agent Prompts

### Monolith Dashboard
> "Build a white dashboard on bg #ffffff with black accent (#171717). All text in Geist font — headings at 600 weight with -0.05em tracking, body at 13px 400 weight. Cards use bg #f5f5f5 with ring-shadow (box-shadow: 0 0 0 1px rgba(0,0,0,0.06)) instead of borders. 6px border-radius everywhere. Sidebar at 220px with left-aligned nav, active item has black bar + rgba(23,23,23,0.06) bg. No color accent — black is the accent."

### Monolith Data Table
> "Create a data table on #ffffff. Header row: Geist 13px 500 #737373, uppercase optional. Body rows: Geist 13px 400 #171717 with 1px bottom border rgba(0,0,0,0.06). Hover: bg #f5f5f5. Status dots: 6px circles (green #22c55e, yellow #eab308, red #ef4444). Row actions: ghost buttons with ring-shadow on hover. No zebra striping."

### Monolith Deployment Feed
> "Design a deployment feed on #ffffff. Each deployment card: bg #ffffff, ring-shadow 0 0 0 1px rgba(0,0,0,0.06), 6px radius. Status dot + domain in Geist 13px 500. Commit hash in Geist Mono 11px #a3a3a3. Branch label: Geist Mono 11px on bg rgba(0,0,0,0.04), pill shape. Timestamp relative ('2m ago'). Hover intensifies ring to rgba(0,0,0,0.12)."

### Monolith Agent Chat
> "Build a chat panel on #ffffff. Agent messages: bg #f5f5f5, ring-shadow, radius 4px 6px 6px 6px. User messages: bg #171717, color #ffffff, radius 6px 4px 6px 6px. No accent color in chat — black and white only. Input bar: ring-shadow, Geist 13px, focus ring 0 0 0 1px #171717. Tool calls: Geist Mono 12px in collapsible blocks."

### Google Font Import
```
Geist is available via next/font/google in Next.js projects:

import { Geist, Geist_Mono } from 'next/font/google'

For non-Next.js projects, self-host from:
https://github.com/vercel/geist-font
```
