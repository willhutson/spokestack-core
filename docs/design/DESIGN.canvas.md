# SpokeStack — DESIGN.md

**Theme: Canvas**
**Version:** 1.0 — April 2026

> Warm minimal, editorial clarity. The first light theme in the SpokeStack collection — built for content studios, consultancies, and boutique agencies that think on paper before they ship.

---

## 1. Visual Theme & Atmosphere

Warm off-white canvas that reads like a well-designed notebook. Lora serif headings bring editorial weight without pretension. The Notion-blue accent is precise and familiar — it says "click here" without shouting. Soft borders, gentle shadows, and generous whitespace create an interface that breathes. This is the theme for teams that write before they build.

**Mood:** Sunday morning at a design studio. Natural light on a clean desk. The brief is open, the coffee is warm, and the interface stays out of the way.

**Reference points:** Notion's editorial calm, Dropbox Paper, Medium's reading experience, Apple Notes' warmth.

---

## 2. Color Palette

### Backgrounds (warm whites)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#faf9f7` | Page background — warm off-white |
| `--bg-surface` | `#f4f2ef` | Cards, panels, sidebar |
| `--bg-elevated` | `#ffffff` | Dropdowns, modals, popovers — pure white lifts |
| `--bg-hover` | `#eceae6` | Hover on interactive surfaces |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `rgba(0,0,0,0.92)` | Headings, primary content — near-black, not pure |
| `--text-secondary` | `#615d59` | Body text, descriptions, labels |
| `--text-tertiary` | `#999999` | Placeholders, timestamps, disabled |

### Accent — Notion Blue
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#0075de` | Primary action, links, active nav, focus rings |
| `--accent-hover` | `#005bab` | Hover — darker, not lighter (light theme convention) |
| `--accent-subtle` | `rgba(0,117,222,0.08)` | Tinted backgrounds, active nav bg, badges |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(0,0,0,0.08)` | Subtle dividers, card edges |
| `--border-strong` | `rgba(0,0,0,0.15)` | Visible borders, input outlines |

### Semantic Colors
| Purpose | Hex | Usage |
|---------|-----|-------|
| Success | `#1a7f37` | Approved, published, completed |
| Warning | `#bf6a02` | Pending, approaching deadline |
| Error | `#cf222e` | Rejected, failed, overdue |
| Info | `#0075de` | Links (matches accent) |

### Structure
| Token | Value |
|-------|-------|
| `--radius` | `8px` — clean, modern, not overly soft |
| `--shadow` | `0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)` |

---

## 3. Typography

### Font Stack
```
--font-heading: 'Lora', Georgia, serif
--font-body:    'Inter', system-ui, -apple-system, sans-serif
--font-mono:    'Berkeley Mono', 'Fira Code', monospace
```

**Serif/sans pairing with editorial intent.** Lora is a well-balanced text serif — readable at small sizes, elegant at display sizes. Its moderate contrast and brushed curves add warmth that geometric sans fonts can't. Inter for body keeps information dense and scannable. The combination says: "We write well, and we organize well."

### Type Scale
| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Page title | Lora | 22–24px | 700 | -0.02em |
| Section heading | Lora | 15–16px | 600–700 | -0.02em |
| Body | Inter | 13–14px | 400 | normal |
| Small body | Inter | 12px | 400 | normal |
| Caption | Inter | 11px | 400–500 | normal |
| Overline | Inter | 10px | 600 | 0.06em, uppercase |
| Mono | Berkeley Mono | 12–13px | 400 | normal |
| CTA button | Inter | 13px | 600 | normal |

### Key Rules
- **Lora at 700 for titles, 600 for section heads.** The weight distinction creates hierarchy within the serif.
- **Body text can be 14px here.** Unlike dark themes, light backgrounds tolerate 14px without feeling loose. Use 13px for dense views, 14px for editorial/reading views.
- **Line-height: 1.6 for body.** More generous than dark themes. Light backgrounds benefit from more air between lines.
- **Never bold Inter in body text.** Use `font-weight: 500` (medium) for emphasis. 600+ in sans-serif body looks like a mistake on a light background.
- **Text-primary is rgba, not hex.** `rgba(0,0,0,0.92)` is warmer than `#000000`. Pure black on off-white creates too much contrast.

---

## 4. Component Styling

### Cards / Surface Panels
```css
background: #f4f2ef;
border: 1px solid rgba(0,0,0,0.08);
border-radius: 8px;
padding: 16px 18px;
```

### Cards on Elevated (modal/dropdown context)
```css
background: #ffffff;
border: 1px solid rgba(0,0,0,0.08);
border-radius: 8px;
box-shadow: 0 1px 2px rgba(0,0,0,0.04),
            0 4px 12px rgba(0,0,0,0.06);
```

### Primary Button
```css
background: #0075de;
color: #ffffff;
border-radius: 8px;
padding: 8px 18px;
font-family: 'Inter';
font-weight: 600;
font-size: 13px;
```

### Secondary / Ghost Button
```css
background: transparent;
border: 1px solid rgba(0,0,0,0.15);
color: #615d59;
border-radius: 8px;
padding: 8px 18px;
```

### Priority / Status Badges
```css
padding: 3px 10px;
border-radius: 6px;
font-size: 10px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.04em;

/* HIGH */     background: rgba(207,34,46,0.08);  color: #cf222e;
/* MEDIUM */   background: rgba(0,117,222,0.08);  color: #0075de;
/* LOW */      background: rgba(0,0,0,0.05);       color: #999;
/* PUBLISHED */ background: rgba(26,127,55,0.08); color: #1a7f37;
```

### Navigation — Active Item
```css
background: rgba(0,117,222,0.08);
color: #0075de;
font-weight: 500;
border-radius: 6px;
padding: 8px 12px;
```

### Agent Chat Bubbles
```css
/* Agent */
background: #ffffff;
border: 1px solid rgba(0,0,0,0.08);
border-radius: 4px 8px 8px 8px;
box-shadow: 0 1px 2px rgba(0,0,0,0.04);

/* User */
background: rgba(0,117,222,0.08);
border: 1px solid rgba(0,117,222,0.12);
border-radius: 8px 4px 8px 8px;
```

### Content Block / Workflow Card
```css
background: #ffffff;
border: 1px solid rgba(0,0,0,0.08);
border-radius: 8px;
padding: 18px 20px;
/* Title: Lora 15px 700 */
/* Status pill: top-right corner */
/* Description: Inter 13px #615d59 */
/* Footer: metadata row — date, author, word count */
```

### Kanban Column (Workflow Canvas)
```css
background: #faf9f7;
border-radius: 8px;
padding: 12px;
min-width: 280px;
/* Column header: Lora 14px 600, Inter overline for count */
/* Cards stack with 8px gap */
/* Drop zone: 2px dashed border rgba(0,117,222,0.20) */
```

### Editorial Preview Card
```css
background: #ffffff;
border: 1px solid rgba(0,0,0,0.06);
border-radius: 8px;
padding: 20px 24px;
/* Headline: Lora 18px 700 rgba(0,0,0,0.92) */
/* Byline: Inter 11px #999 */
/* Excerpt: Inter 14px #615d59, line-height 1.6 */
/* Read more: #0075de, no underline, underline on hover */
```

---

## 5. Layout & Spacing

### Page Structure
```
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │ Main Content           │ Agent Panel  │
│ 232px    │ flex: 1                │ 340px        │
│ (or 56px │ padding: 28px 32px     │ (collapsible)│
│ compact) │                        │              │
└──────────┴────────────────────────┴──────────────┘
```

- **Sidebar:** 232px full, 56px compact. Background: `--bg-surface` (#f4f2ef).
- **Main content:** Flexible. Padding: 28px 32px — slightly more generous than dark themes. Light backgrounds reward whitespace.
- **Agent Panel:** 340px. Right-docked. Background: `--bg-base` (#faf9f7).
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
- Content cards: 2- or 3-column wrap at 300px each, 16px gap.
- Workflow kanban: horizontal scroll, columns at 280px, 12px gap.
- Stat cards: Equal flex, 12px gap.

---

## 6. Depth & Shadows

Canvas uses shadows for hierarchy — unlike dark themes where borders do the work.

```css
/* Card at rest */
box-shadow: 0 1px 2px rgba(0,0,0,0.04);  /* barely visible lift */

/* Elevated surface (modals, dropdowns) */
box-shadow: 0 1px 2px rgba(0,0,0,0.04),
            0 4px 12px rgba(0,0,0,0.06);

/* Card hover */
box-shadow: 0 2px 8px rgba(0,0,0,0.08);

/* Active/focused card */
box-shadow: 0 0 0 3px rgba(0,117,222,0.15);

/* Floating action button */
box-shadow: 0 2px 8px rgba(0,0,0,0.12);

/* Modal backdrop */
background: rgba(0,0,0,0.2);  /* lighter than dark theme overlays */
```

---

## 7. Design Guardrails

### Do
- Use Lora ONLY for headings and editorial titles. Never for body, navigation labels, or buttons.
- Embrace whitespace. Canvas has more padding, more margin, more air than any dark theme. If it feels tight, add space.
- Use `rgba(0,0,0,0.92)` for primary text, not `#000000`. Pure black on off-white creates eye strain.
- Let shadows create depth. Light themes rely on shadow hierarchy more than border hierarchy.
- Use the warm off-whites (`#faf9f7`, `#f4f2ef`). Pure `#ffffff` is reserved for elevated surfaces only — it's a privilege, not a default.
- Show content previews generously. Canvas is editorial — the writing IS the product.

### Don't
- Don't use dark mode patterns. No glow effects, no neon accents, no accent-tinted borders.
- Don't use pure white (`#ffffff`) as the page base. The warm tone is the Canvas identity. Pure white is clinical.
- Don't make the accent any warmer. `#0075de` is precisely chosen — no orange-blue, no teal. Cool blue on warm paper is the tension that makes Canvas work.
- Don't compress typography. Canvas is generous with line-height (1.6) and paragraph spacing. This is not a data-dense theme.
- Don't use colored backgrounds for cards. Cards are `#f4f2ef` or `#ffffff`. Color goes into text, badges, and borders.
- Don't use monospace prominently. Tool calls and code should be collapsed or de-emphasized. Canvas is for writers, not developers.

---

## 8. Responsive Behavior

| Breakpoint | Sidebar | Agent Panel | Layout |
|------------|---------|-------------|--------|
| > 1280px | Full (232px) | Open (340px) | 3-column |
| 1024–1280px | Compact (56px) | Open (340px) | 2-column + panel |
| 768–1024px | Compact (56px) | Collapsed (toggle) | 2-column |
| < 768px | Hidden (drawer) | Full-screen overlay | 1-column |

On mobile, the Agent Panel becomes a full-screen overlay triggered by a floating button (bottom-right, #0075de, 48px circle, soft shadow):
```css
box-shadow: 0 2px 12px rgba(0,117,222,0.25);
```

---

## 9. AI Agent Prompts

### Canvas Dashboard
> "Build a light dashboard on bg #faf9f7 with Notion-blue (#0075de) accent. Headings in Lora serif 700 at 22px with -0.02em tracking. Body in Inter 14px. Cards use bg #f4f2ef with 8px border-radius and 1px borders at rgba(0,0,0,0.08). Sidebar at 232px on #f4f2ef. Agent panel at 340px right-docked on #faf9f7. Elevated surfaces (modals) use pure #ffffff with shadow 0 4px 12px rgba(0,0,0,0.06)."

### Canvas Workflow Board
> "Create a kanban workflow board on #faf9f7. Columns (Draft, Review, Published) are 280px wide with horizontal scroll. Column headers in Lora 14px 600 with count badge. Cards are #ffffff with 8px radius, subtle shadow, Inter 13px body. Drop zones use 2px dashed border rgba(0,117,222,0.20). Card hover lifts with shadow 0 2px 8px rgba(0,0,0,0.08)."

### Canvas Editorial Preview
> "Design an editorial content preview page on #faf9f7. Article cards on #ffffff with 8px radius, 20px 24px padding. Headline in Lora 18px 700, byline in Inter 11px #999, excerpt in Inter 14px #615d59 with line-height 1.6. 'Read more' link in #0075de, no underline, underline on hover. Status badges top-right: PUBLISHED green, DRAFT gray."

### Canvas Agent Chat
> "Build a light-theme chat panel on #faf9f7. Agent messages: bg #ffffff, 1px border rgba(0,0,0,0.08), radius 4px 8px 8px 8px, subtle shadow. User messages: bg rgba(0,117,222,0.08), border rgba(0,117,222,0.12), radius 8px 4px 8px 8px. Agent avatar is 20px rounded-square (#0075de, 6px radius). Input bar at bottom with 8px radius, #f4f2ef bg, 1px border rgba(0,0,0,0.12)."

### Google Font Import
```html
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap" rel="stylesheet">
```
