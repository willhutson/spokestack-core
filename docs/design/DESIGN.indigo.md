# SpokeStack — DESIGN.md

**Theme: Indigo**
**Version:** 1.0 — April 2026

> Deep navy authority. Houbara's aesthetic — built for PR firms, government comms, and MENA-market agencies that need gravitas without coldness.

---

## 1. Visual Theme & Atmosphere

Deep indigo canvas that reads like a midnight brief. Fraunces serif headings deliver soft authority — formal enough for government media, warm enough for creative briefs. The bright indigo-violet accent cuts through the navy with precise intention. Rounded corners (12px) keep the feel approachable despite the darkness. This is not a hacker theme — it is a diplomat's control room.

**Mood:** Late evening at the press office. The brief is being finalized. The language is precise, the stakes are real, and the interface reflects that weight.

**Reference points:** Bloomberg Terminal's density meets The Economist's editorial confidence. Houbara's brand identity. Al Jazeera English's digital presence.

---

## 2. Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0e0e2e` | Page background — deep navy-black |
| `--bg-surface` | `#161640` | Cards, panels, sidebar |
| `--bg-elevated` | `#1e1e52` | Dropdowns, modals, popovers |
| `--bg-hover` | `#24245c` | Hover on interactive surfaces |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#f0f0ff` | Headings, primary content — cool white |
| `--text-secondary` | `#9999cc` | Body text, descriptions, labels |
| `--text-tertiary` | `#666699` | Placeholders, timestamps, disabled |

### Accent — Bright Indigo-Violet
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#6C63FF` | Primary action, active states, CTA |
| `--accent-hover` | `#7C74FF` | Hover — lighter, more luminous |
| `--accent-subtle` | `rgba(108,99,255,0.12)` | Tinted backgrounds, active nav bg, badges |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(255,255,255,0.08)` | Subtle dividers, card edges |
| `--border-strong` | `rgba(255,255,255,0.14)` | Visible borders, input outlines |

### Semantic Colors
| Purpose | Hex | Usage |
|---------|-----|-------|
| Success | `#50B450` | Approved, published, delivered |
| Warning | `#f5a623` | Pending review, approaching deadline |
| Error | `#ef4444` | Rejected, killed, retracted |
| Info | `#6C63FF` | Links, references (matches accent) |

### Structure
| Token | Value |
|-------|-------|
| `--radius` | `12px` — rounded, approachable, diplomatic |
| `--shadow` | `0 2px 8px rgba(14,14,46,0.6), 0 8px 24px rgba(0,0,0,0.4)` |

---

## 3. Typography

### Font Stack
```
--font-heading: 'Fraunces', Georgia, serif
--font-body:    'Inter', system-ui, -apple-system, sans-serif
--font-mono:    'Berkeley Mono', 'Fira Code', monospace
```

**Two fonts, deliberate contrast.** Fraunces for headings — a soft-serif optical size font that carries authority without stiffness. Inter for body — neutral, readable, dense. The serif/sans pairing is the Indigo identity: editorial gravitas meets operational clarity.

### Type Scale
| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Page title | Fraunces | 22–24px | 700 | -0.02em |
| Section heading | Fraunces | 15–16px | 700 | -0.02em |
| Body | Inter | 13px | 400–500 | normal |
| Small body | Inter | 12px | 400 | normal |
| Caption | Inter | 11px | 400–500 | normal |
| Overline | Inter | 10px | 600 | 0.06em, uppercase |
| Mono | Berkeley Mono | 11–13px | 400 | normal |
| CTA button | Inter | 12–13px | 600 | normal |

### Key Rules
- **Fraunces is headings only.** Never use Fraunces for body text, buttons, or labels. Its optical sizing makes it wrong below 15px.
- **Tracking is gentle negative.** -0.02em — not the aggressive -0.05em of Volt. Indigo compresses slightly but keeps readability for bilingual audiences.
- **Body is Inter at 13px.** Same density as Obsidian. The serif headings provide enough visual distinction — body doesn't need to compete.
- **Serif weight is always 700.** Fraunces at 400 is too light against navy backgrounds. Bold serif on dark blue is the Indigo signature.

---

## 4. Component Styling

### Cards / Surface Panels
```css
background: #161640;
border: 1px solid rgba(255,255,255,0.08);
border-radius: 12px;                /* rounded — Indigo signature */
padding: 16px 18px;
```

### Brief Cards (Active / In-Review)
```css
border-left: 3px solid #6C63FF;
border-color: rgba(255,255,255,0.12);
background: #161640;
/* Status indicator: small dot top-right, pulsing for "Under Review" */
```

### Primary Button
```css
background: #6C63FF;
color: #ffffff;
border-radius: 12px;
padding: 8px 18px;
font-family: 'Inter';
font-weight: 600;
font-size: 13px;
```

### Secondary / Ghost Button
```css
background: transparent;
border: 1px solid rgba(255,255,255,0.14);
color: #9999cc;
border-radius: 12px;
padding: 8px 18px;
```

### Priority / Status Badges
```css
padding: 3px 10px;
border-radius: 8px;
font-size: 10px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.04em;

/* URGENT */  background: rgba(239,68,68,0.12);  color: #ef4444;
/* REVIEW */  background: rgba(108,99,255,0.12);  color: #6C63FF;
/* APPROVED */ background: rgba(80,180,80,0.12);  color: #50B450;
/* DRAFT */   background: rgba(255,255,255,0.06); color: #666699;
```

### Navigation — Active Item
```css
background: rgba(108,99,255,0.12);
color: #6C63FF;
font-weight: 500;
border-radius: 10px;
padding: 8px 14px;
/* Badge count: indigo text on indigo-subtle bg */
```

### Agent Chat Bubbles
```css
/* Agent */
background: #1e1e52;
border: 1px solid rgba(255,255,255,0.08);
border-radius: 4px 12px 12px 12px;

/* User */
background: rgba(108,99,255,0.12);
border: 1px solid rgba(108,99,255,0.18);
border-radius: 12px 4px 12px 12px;
```

### Brief Preview Panel
```css
background: #161640;
border: 1px solid rgba(255,255,255,0.08);
border-radius: 12px;
padding: 20px 24px;
/* Title: Fraunces 18px 700 */
/* Outlet/Journalist: Inter 12px uppercase #666699 */
/* Body preview: Inter 13px #9999cc */
/* Approval status: colored dot + label bottom-left */
```

### Artifact Review Card
```css
background: #161640;
border: 1px solid rgba(108,99,255,0.10);
border-radius: 12px;
padding: 16px;
/* Header: document icon + title in Fraunces 15px */
/* Meta row: date, author, version — Inter 11px #666699 */
/* Actions: Approve/Reject buttons in row */
```

---

## 5. Layout & Spacing

### Page Structure
```
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │ Main Content           │ Briefing     │
│ 232px    │ flex: 1                │ Panel 360px  │
│ (or 56px │ padding: 24px 28px     │ (collapsible)│
│ compact) │                        │              │
└──────────┴────────────────────────┴──────────────┘
```

- **Sidebar:** 232px full, 56px compact. Background: `--bg-surface` (#161640).
- **Main content:** Flexible. Padding: 24px 28px.
- **Briefing Panel:** 340–380px. Right-docked. For agent chat and brief review.
- **Top bar:** 52px height. Border-bottom: `--border`.

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
- Brief cards: 2-column at >=1280px, 1-column below. 16px gap.
- Artifact rows: Full-width, 10px vertical gap.
- Stat cards: Equal flex, 12px gap.

---

## 6. Depth & Shadows

Indigo shadows lean blue-black — the base color tints everything.

```css
/* Card at rest */
box-shadow: none;  /* border only */

/* Elevated surface (modals, dropdowns) */
box-shadow: 0 2px 8px rgba(14,14,46,0.6),
            0 8px 24px rgba(0,0,0,0.4);

/* Card hover */
box-shadow: 0 2px 12px rgba(14,14,46,0.5);

/* Active/focused card */
box-shadow: 0 0 0 4px rgba(108,99,255,0.15);

/* Agent online indicator */
box-shadow: 0 0 8px rgba(108,99,255,0.5);

/* Brief approval glow (approved state) */
box-shadow: 0 0 12px rgba(80,180,80,0.2);
```

---

## 7. Design Guardrails

### Do
- Use Fraunces ONLY for headings and page titles. Never for body, labels, or buttons.
- Keep radius at 12px on cards and buttons. This roundness IS the Indigo differentiator.
- Maintain the navy-to-indigo background progression. The blue undertone separates Indigo from Obsidian's neutral dark.
- Use serif headings to signal editorial authority. Briefs, reports, press releases — this is publishing, not shipping code.
- Reserve the indigo-violet accent for actions and active states only. If everything glows, nothing commands.
- Show brief metadata prominently: outlet name, journalist, deadline. These are first-class data in Houbara's world.

### Don't
- Don't use warm tones. No amber, no copper, no earth. Indigo is cool and institutional.
- Don't use tight radius (4px, 6px). That's Volt/Monolith territory. Rounded corners are non-negotiable here.
- Don't display code blocks or terminal output prominently. This is not a developer theme — tool calls should be collapsed by default.
- Don't use all-caps headings in Fraunces. Serif all-caps at large sizes reads as legal disclaimer, not authority.
- Don't lighten the base background. #0e0e2e must stay deep. Lighter navy (#2a2a5a) loses the gravitas.
- Don't mix serif fonts. If Fraunces is the heading font, Georgia appears only as a fallback, never as a design choice.

---

## 8. Responsive Behavior

| Breakpoint | Sidebar | Briefing Panel | Layout |
|------------|---------|----------------|--------|
| > 1280px | Full (232px) | Open (360px) | 3-column |
| 1024–1280px | Compact (56px) | Open (340px) | 2-column + panel |
| 768–1024px | Compact (56px) | Collapsed (toggle) | 2-column |
| < 768px | Hidden (drawer) | Full-screen overlay | 1-column |

On mobile, the Briefing Panel becomes a full-screen overlay triggered by a floating agent button (bottom-right, #6C63FF, 48px circle, 12px radius):
```css
box-shadow: 0 0 0 0 rgba(108,99,255,0.4);
animation: pulse 2.5s infinite;
```

---

## 9. AI Agent Prompts

### Indigo Dashboard
> "Build a dark dashboard on bg #0e0e2e with indigo-violet (#6C63FF) accent. Headings in Fraunces serif 700 at 22px with -0.02em tracking. Body in Inter 13px. Cards use bg #161640 with 12px border-radius and 1px borders at rgba(255,255,255,0.08). Sidebar at 232px on #161640. Briefing panel at 360px right-docked."

### Indigo Brief Review
> "Create a brief review view on #0e0e2e. Each brief is a card on #161640 with 12px radius. Title in Fraunces 16px 700. Meta row: outlet name, journalist, deadline in Inter 11px #666699. Status badge: URGENT in red, REVIEW in indigo-violet, APPROVED in green. Active briefs have 3px left border in #6C63FF. Include an 'Approve' button and 'Request Changes' ghost button."

### Indigo Agent Chat
> "Build a chat panel on #0e0e2e. Agent messages: bg #1e1e52, 1px border rgba(255,255,255,0.08), radius 4px 12px 12px 12px. User messages: bg rgba(108,99,255,0.12), border rgba(108,99,255,0.18), radius 12px 4px 12px 12px. Agent avatar is 20px rounded-square (#6C63FF, 6px radius). Input bar at bottom with 12px radius, #161640 bg."

### Indigo Government Media Brief (Artifact)
> "Design a media brief document artifact on #161640. Header: Fraunces 20px bold title, Inter 11px uppercase date and classification. Body sections with Inter 13px #9999cc. Key messages in bordered callout boxes with left border #6C63FF. Approval workflow at bottom: three steps (Draft, Review, Published) as horizontal stepper with indigo-violet active state."

### Google Font Import
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&display=swap" rel="stylesheet">
```
