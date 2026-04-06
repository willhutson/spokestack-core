# SpokeStack — DESIGN.md

**Theme: Obsidian (Default)**
**Version:** 1.0 — April 2026

> Copy this file into your project root. Tell your AI agent: "Build me a page that looks like this" and get pixel-perfect SpokeStack UI.

---

## 1. Visual Theme & Atmosphere

Dark-native, engineered precision. The interface feels like infrastructure — not decoration. Every element justifies its presence. The dark palette creates focus; the accent breaks it intentionally.

**Mood:** Control room at night. Dense with information, calm in tone. The agent chat panel glows softly at the right edge — the system is always listening, always ready.

**Reference points:** Linear's density, Vercel's restraint, Raycast's dark confidence.

---

## 2. Color Palette

### Backgrounds (dark → light progression)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0f1011` | Page background, canvas |
| `--bg-surface` | `#191a1b` | Cards, panels, sidebar |
| `--bg-elevated` | `#28282c` | Dropdowns, modals, popovers |
| `--bg-hover` | `#2e2e33` | Hover state on interactive surfaces |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#f7f8f8` | Headings, primary content |
| `--text-secondary` | `#8a8f98` | Body text, descriptions, labels |
| `--text-tertiary` | `#62666d` | Placeholders, timestamps, disabled |

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#7170ff` | Buttons, links, active nav, focus rings |
| `--accent-hover` | `#828fff` | Hover on accent elements |
| `--accent-subtle` | `rgba(113,112,255,0.12)` | Tinted backgrounds, active nav bg, badges |

### Borders & Structure
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(255,255,255,0.06)` | Subtle dividers, card edges |
| `--border-strong` | `rgba(255,255,255,0.12)` | Visible borders, input outlines |

### Semantic Colors
| Purpose | Hex | Usage |
|---------|-----|-------|
| Success | `#50B450` | Approved, completed, paid, available |
| Warning | `#f59e0b` | High priority, overloaded, overdue |
| Error | `#ef4444` | Rejected, failed, expenses |
| Info | `#0a72ef` | Links in light contexts |

---

## 3. Typography

### Font Stack
```
--font-heading: 'Inter Variable', system-ui, -apple-system, sans-serif
--font-body:    'Inter Variable', system-ui, -apple-system, sans-serif
--font-mono:    'Berkeley Mono', 'Fira Code', 'JetBrains Mono', monospace
```

Inter Variable is the single typeface. Headings and body share the font — hierarchy is created through weight, size, and letter-spacing, not font changes.

### Type Scale
| Role | Size | Weight | Tracking | Usage |
|------|------|--------|----------|-------|
| Page title | 22px | 600 | -0.04em | Page headings ("Tasks", "Orders") |
| Section heading | 14px | 600 | -0.02em | Card titles, section labels |
| Body | 13px | 400 | normal | Primary content, descriptions |
| Small body | 12px | 400 | normal | Secondary info, module labels |
| Caption | 11px | 400–500 | normal | Timestamps, badges, metadata |
| Overline | 10px | 600 | 0.08em | Section dividers ("MODULES", "TO DO"), uppercase |
| Mono | 10–13px | 400 | normal | Code, tool calls, CLI output |

### Key Rules
- **Negative letter-spacing on headings.** -0.04em at 18px+. This creates the compressed, engineered feel.
- **Body text is 13px, not 14px.** Denser information display. 14px feels loose in dark UI.
- **Line-height: 1.5 for body, 1.15 for headings.** Headings are tight; body breathes.
- **No bold body text.** Use `font-weight: 500` (medium) for emphasis in body. 600+ is reserved for headings and labels.

---

## 4. Component Styling

### Cards / Surface Panels
```css
background: var(--bg-surface);      /* #191a1b */
border: 1px solid var(--border);     /* rgba(255,255,255,0.06) */
border-radius: var(--radius);        /* 8px */
padding: 14px 16px;
```

### Active/In-Progress Cards
```css
border-left: 3px solid var(--accent);  /* #7170ff */
border-color: var(--border-strong);     /* rgba(255,255,255,0.12) */
```

### Buttons — Primary
```css
background: var(--accent);           /* #7170ff */
color: #ffffff;
border-radius: var(--radius);        /* 8px */
padding: 6px 14px;
font-size: 12px;
font-weight: 600;
```

### Buttons — Secondary / Ghost
```css
background: transparent;
border: 1px solid var(--border-strong);
color: var(--text-secondary);
border-radius: var(--radius);
padding: 6px 14px;
```

### Input Fields
```css
background: var(--bg-surface);
border: 1px solid var(--border-strong);
border-radius: var(--radius);
padding: 10px 14px;
font-size: 13px;
color: var(--text-primary);
```
Placeholder color: `var(--text-tertiary)`.

### Badges / Status Pills
```css
padding: 2px 8px;
border-radius: 6px;
font-size: 10px;
font-weight: 500;
text-transform: uppercase;
```
Use `--accent-subtle` bg with `--accent` text for active states. Use semantic colors for status (approved = green bg/text, etc).

### Navigation — Sidebar
```css
/* Active nav item */
background: var(--accent-subtle);    /* rgba(113,112,255,0.12) */
color: var(--accent);                /* #7170ff */
font-weight: 500;
border-radius: 6px;
padding: 8px 12px;

/* Inactive nav item */
color: var(--text-secondary);        /* #8a8f98 */
```

### Agent Avatar (Mission Control)
```css
width: 18px; height: 18px;
background: var(--accent);
border-radius: 4px;
font-size: 9px;
font-weight: 700;
color: #ffffff;
/* Contains first letter of agent type: T, P, B, O, C, F */
```

### Agent Message Bubble
```css
/* Agent messages */
background: var(--bg-elevated);      /* #28282c */
border: 1px solid var(--border);
border-radius: 2px 8px 8px 8px;      /* top-left sharp = agent */

/* User messages */
background: var(--accent-subtle);
border: 1px solid rgba(113,112,255,0.15);
border-radius: 8px 2px 8px 8px;      /* top-right sharp = user */
```

### Context Graph Insight Callout
```css
padding: 10px 12px;
background: rgba(113,112,255,0.06);
border: 1px solid rgba(113,112,255,0.10);
border-radius: 6px;
/* Starts with ✦ icon in accent color */
```

---

## 5. Layout & Spacing

### Page Structure
```
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │ Main Content           │ Mission Ctrl │
│ 232px    │ flex: 1                │ 340px        │
│ (or 56px │ padding: 24px 28px     │ (collapsible)│
│ compact) │                        │              │
└──────────┴────────────────────────┴──────────────┘
```

- **Sidebar:** 232px full, 56px compact (icon-only). Background: `--bg-surface`.
- **Main content:** Flexible width. Padding: 24px 28px. Scroll-y.
- **Mission Control:** 340–380px. Right-docked. Background: `--bg-base` or slightly darker.
- **Top bar:** 52–56px height. Border-bottom: `--border`.

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
- Module cards: 3-column wrap at 264px each, 20px gap.
- Task/order rows: Full-width, 8–10px vertical gap.
- Stat cards: Equal flex, 12px gap.

---

## 6. Depth & Shadows

```css
--shadow: 0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3);
```

Shadows in dark UI are subtle — backgrounds are already dark. Use shadows sparingly:
- **Cards at rest:** No shadow. Border only.
- **Elevated surfaces (modals, dropdowns):** `--shadow`.
- **Active/focused cards:** `box-shadow: 0 0 0 4px var(--accent-subtle)` (focus ring, not depth).
- **Agent online indicator:** `box-shadow: 0 0 6px rgba(113,112,255,0.5)` (glow effect).

---

## 7. Design Guardrails

### Do
- Use CSS variables for ALL colors. No hardcoded hex in components.
- Keep card borders at 1px. Never 2px except active selection.
- Use the 13px body size. Resist the urge to go 14px.
- Keep heading tracking negative. Loosen tracking = lose the identity.
- Let the accent color do the work. One accent, used consistently.
- Show tool calls in monospace in Mission Control — users see the system thinking.

### Don't
- Don't use gradients anywhere. Flat colors only.
- Don't use colored backgrounds for status — use colored text/border on dark cards.
- Don't center-align body text. Left-align everything except hero headlines.
- Don't use more than 2 font weights on a single card (e.g., 600 heading + 400 body).
- Don't put shadows on flat cards in dark mode — it looks muddy.
- Don't use rounded avatars for agents. Agents get square (border-radius: 4px) avatars. Humans get circles.

---

## 8. Responsive Behavior

| Breakpoint | Sidebar | Mission Control | Layout |
|------------|---------|-----------------|--------|
| > 1280px | Full (232px) | Open (340px) | 3-column |
| 1024–1280px | Compact (56px) | Open (340px) | 2-column + MC |
| 768–1024px | Compact (56px) | Collapsed (toggle) | 2-column |
| < 768px | Hidden (drawer) | Full-screen overlay | 1-column |

On mobile, Mission Control becomes a full-screen chat overlay triggered by a floating agent button (bottom-right, accent-colored, 48px circle).

---

## 9. AI Agent Prompts

Use these prompts with any AI code agent to generate SpokeStack-style UI:

### Full Dashboard Page
> "Build a dashboard page with a 232px dark sidebar (bg #191a1b), main content area (bg #0f1011), and 340px right panel for agent chat. Use Inter font, 13px body, accent color #7170ff. Cards have 1px borders at rgba(255,255,255,0.06) and 8px radius. Active nav item has rgba(113,112,255,0.12) background."

### Task List
> "Create a task list with grouped sections (To Do, In Progress, Done). Each task is a horizontal card with checkbox, title (13px white), subtitle (11px #62666d), and priority badge. In-progress cards have a 3px left border in #7170ff. Use 8px gap between cards."

### Agent Chat Panel
> "Build a chat panel with agent messages (bg #28282c, top-left sharp radius) and user messages (bg rgba(113,112,255,0.12), top-right sharp radius). Agent avatar is 18px square, #7170ff, 4px radius. Show tool calls in monospace with green arrows. Add a context insight callout at the bottom with ✦ icon."

### Module Card (Marketplace)
> "Design a module card at 350px wide. Header with 36px icon, module name in serif 15px, 'by SpokeStack' subtitle. Description in 13px muted text. 'Ships with X Agent' line with small green dot. Footer with price and Install button. 12px rounded corners, subtle shadow."
