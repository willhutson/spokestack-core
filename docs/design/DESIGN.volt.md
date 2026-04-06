# SpokeStack — DESIGN.md

**Theme: Volt**
**Version:** 1.0 — April 2026

> Electric mint, kinetic energy. LMTD's aesthetic — built for creative and digital agencies that move fast.

---

## 1. Visual Theme & Atmosphere

Black canvas, electric mint cuts through like neon signage in a dark city. Tight border-radius (4px) creates an edgy, technical feel. Space Grotesk headings give geometric authority. The whole UI feels like a mission control for a high-velocity creative team.

**Mood:** Midnight sprint. The team is shipping. The terminal is open. The agent is running.

**Reference points:** Warp terminal, Figma's dark mode, GitHub's Primer dark with a neon twist.

---

## 2. Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0a0a0a` | Page background — pure near-black |
| `--bg-surface` | `#121212` | Cards, panels, sidebar |
| `--bg-elevated` | `#1a1a1a` | Dropdowns, modals |
| `--bg-hover` | `#222222` | Hover on interactive surfaces |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#ffffff` | Headings — pure white, no warmth |
| `--text-secondary` | `#888888` | Body, labels |
| `--text-tertiary` | `#555555` | Placeholders, disabled |

### Accent — Electric Mint
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#00E5A0` | Primary action, active states, CTA |
| `--accent-hover` | `#00FFB3` | Hover — brighter, not darker |
| `--accent-subtle` | `rgba(0,229,160,0.10)` | Tinted backgrounds, active nav |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(0,229,160,0.12)` | Accent-tinted borders — not neutral |
| `--border-strong` | `rgba(0,229,160,0.20)` | Input focus, active cards |

### Structure
| Token | Value |
|-------|-------|
| `--radius` | `4px` — tight, edgy, technical |
| `--shadow` | `0 0 0 1px rgba(0,229,160,0.08), 0 4px 20px rgba(0,229,160,0.05)` — mint-tinted glow |

---

## 3. Typography

### Font Stack
```
--font-heading: 'Space Grotesk', system-ui, sans-serif
--font-body:    'Inter', system-ui, sans-serif
--font-mono:    'Berkeley Mono', 'Fira Code', monospace
```

**Two fonts, distinct roles.** Space Grotesk for headings — geometric, wide, confident. Inter for body — readable, neutral, dense. This contrast is the Volt identity.

### Type Scale
| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Page title | Space Grotesk | 18–20px | 700 | -0.04em |
| Section label | Space Grotesk | 12px | 600 | 0.04em, uppercase |
| Body | Inter | 13px | 400–500 | normal |
| Caption | Inter | 11px | 400–500 | normal |
| Overline | Inter | 10px | 600 | 0.08em, uppercase |
| Code / CLI | Berkeley Mono | 13px | 400 | normal |
| CTA button | Space Grotesk | 12–14px | 600 | -0.01em |

### Key Rules
- **Headings are bold.** Weight 700, always. Space Grotesk doesn't do subtle.
- **Tracking is aggressive.** -0.05em on display sizes. The text compresses like code.
- **Monospace is a first-class citizen.** Tool calls, CLI output, context graph keys — all monospace. This is a dev-facing theme.

---

## 4. Component Styling

### Cards
```css
background: #121212;
border: 1px solid rgba(0,229,160,0.08);
border-radius: 4px;               /* tight — Volt signature */
padding: 14px 16px;
```

### Active Cards (in-progress tasks)
```css
border-left: 3px solid #00E5A0;
border-color: rgba(0,229,160,0.12);
background: #121212;
/* Checkbox gets mint fill: rgba(0,229,160,0.15) */
```

### Primary Button
```css
background: #00E5A0;
color: #0a0a0a;                    /* dark text on mint */
border-radius: 4px;
padding: 6px 14px;
font-family: 'Space Grotesk';
font-weight: 600;
```

### Priority Badges
```css
/* HIGH */  background: rgba(255,180,0,0.12);  color: #FFB400;
/* MEDIUM */ background: rgba(0,229,160,0.10); color: #00E5A0;
/* LOW */    background: rgba(255,255,255,0.06); color: #888;
```

### Navigation — Active Item
```css
background: rgba(0,229,160,0.10);
color: #00E5A0;
font-weight: 500;
border-radius: 4px;
/* Badge: mint text on mint-subtle bg */
```

### Agent Chat Bubbles
```css
/* Agent */
background: #1a1a1a;
border: 1px solid rgba(0,229,160,0.06);
border-radius: 2px 8px 8px 8px;

/* User */
background: rgba(0,229,160,0.10);
border: 1px solid rgba(0,229,160,0.15);
border-radius: 8px 2px 8px 8px;
```

### Tool Call Display
```css
background: rgba(0,229,160,0.04);
border: 1px solid rgba(0,229,160,0.08);
border-radius: 4px;
font-family: 'Berkeley Mono';
font-size: 10px;
/* Arrow indicator: → in #00E5A0 */
/* Completed: ✓ in #555 */
/* In-progress: pulsing dot in #00E5A0 */
```

### Terminal Mockup (Landing Page)
```css
background: #0e0e0e;
border: 1px solid rgba(0,229,160,0.10);
border-radius: 12px;
box-shadow: 0 0 0 1px rgba(0,229,160,0.04),
            0 20px 60px rgba(0,0,0,0.6),
            0 0 120px rgba(0,229,160,0.03);  /* outer glow */
/* Title bar dots: #ff5f56, #ffbd2e, #27c93f */
/* Command prompt: $ in #00E5A0 */
```

---

## 5. Layout & Spacing

Same 3-column layout as Obsidian. Key difference: Volt uses tighter padding (12px vs 14px on cards) and smaller gaps (8px vs 10px between list items). The density matches the compressed typography.

### Volt-Specific Spacing
- Card padding: 12px 14px (tighter than default)
- Grid gap: 8px between task rows
- Section gap: 12px between section header and first card
- Terminal mockup: 20px 24px internal padding

---

## 6. Depth & Shadows

Volt shadows are mint-tinted — not neutral black.

```css
/* Card hover */
box-shadow: 0 0 0 1px rgba(0,229,160,0.12);

/* Elevated surface */
box-shadow: 0 0 0 1px rgba(0,229,160,0.08),
            0 4px 20px rgba(0,229,160,0.05);

/* Agent online indicator */
box-shadow: 0 0 8px rgba(0,229,160,0.6);

/* CTA button glow (landing page) */
box-shadow: 0 0 20px rgba(0,229,160,0.15);
```

---

## 7. Design Guardrails

### Do
- Use Space Grotesk ONLY for headings and CTAs. Never for body text.
- Keep radius at 4px. Resist 8px — that's Obsidian, not Volt.
- Tint borders with mint. Neutral borders (rgba white) lose the Volt identity.
- Show the terminal. CLI references, monospace output, tool calls — lean into the dev aesthetic.
- Use pure white (#ffffff) for primary text. No warm grays.

### Don't
- Don't soften the palette. No warm tones. Volt is cold.
- Don't round the corners. 4px max. 12px is Canvas territory.
- Don't hide the agent's tool calls. In Volt, the plumbing is part of the product.
- Don't use serif fonts anywhere. Volt is geometric.
- Don't use subtle accents. Mint should pop. If it doesn't feel electric, it's wrong.

---

## 8. Responsive Behavior

Same breakpoints as Obsidian. On mobile, the agent chat button is a 48px mint circle with a pulsing glow animation:
```css
box-shadow: 0 0 0 0 rgba(0,229,160,0.4);
animation: pulse 2s infinite;
```

---

## 9. AI Agent Prompts

### Volt Dashboard
> "Build a dark dashboard (bg #0a0a0a) with electric mint (#00E5A0) accent. Headings in Space Grotesk 700, body in Inter 13px. Cards have 4px radius, 1px borders tinted rgba(0,229,160,0.08). Sidebar at 232px with mint-tinted active states. Agent panel at 340px on the right."

### Volt Task List
> "Create tasks as horizontal rows on bg #121212 with mint-tinted borders. Active tasks have a 3px left border in #00E5A0. Priority badges: HIGH in amber (#FFB400), MEDIUM in mint. Section headers in Space Grotesk 12px uppercase with 0.04em tracking."

### Volt Landing Page
> "Build a hero section on #050505 with Space Grotesk 56px heading in white, 'npx spokestack init' as a mint CTA button. Below: a terminal mockup with traffic light dots, showing CLI output with green checkmarks and an agent conversation. Mint glow shadow on the terminal. Stats strip at bottom: '3 min', '4 agents', '5 surfaces', '$0' in Space Grotesk 36px mint."

### Volt Content Calendar (Artifact)
> "Create a week-view content calendar on dark bg. 5 columns (Mon–Fri), each with day label in 10px uppercase. Content entries as cards with colored left borders (mint for IG, amber for X, indigo for LinkedIn). Include a 'Generating...' state with shimmer placeholders that fade from opacity 0.4 to 0.2."

### Google Font Import
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
```
