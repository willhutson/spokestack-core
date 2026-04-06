# SpokeStack — DESIGN.md

**Theme: Copper**
**Version:** 1.0 — April 2026

> Warm dark luxury. Burnished copper on deep espresso. The premium MENA theme — built for high-end brands, finance, legal, and client-facing revenue views where AED numbers need to feel heavy.

---

## 1. Visual Theme & Atmosphere

Near-black with a warm amber undertone. The base isn't cold gray — it's a deep, smoky espresso. Copper accent catches light like a burnished metal nameplate. Cormorant Garamond headings are tall, elegant, and slightly open-tracked — the opposite of compressed SaaS type. This is the theme for revenue dashboards where the numbers represent real relationships and real money. Every surface feels like dark leather. Every interaction feels considered.

**Mood:** Private members' lounge at midnight in DIFC. Polished surfaces, low light, high stakes. The client's name is on the screen, and it deserves respect.

**Reference points:** Aman Resorts' web presence, Bloomberg's premium tier, Aesop's dark e-commerce, LVMH digital experiences.

---

## 2. Color Palette

### Backgrounds (warm darks)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#120e0a` | Page background — warm near-black, espresso undertone |
| `--bg-surface` | `#1c1610` | Cards, panels, sidebar |
| `--bg-elevated` | `#261e14` | Dropdowns, modals, popovers |
| `--bg-hover` | `#302618` | Hover on interactive surfaces |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#f5ede0` | Headings, primary content — warm parchment white |
| `--text-secondary` | `#a08060` | Body text, descriptions — muted gold |
| `--text-tertiary` | `#6b5535` | Placeholders, timestamps, disabled |

### Accent — Burnished Copper
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#C47A2B` | Primary action, active states, CTA |
| `--accent-hover` | `#D4893A` | Hover — warmer, brighter |
| `--accent-subtle` | `rgba(196,122,43,0.12)` | Tinted backgrounds, active nav bg, badges |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(196,122,43,0.15)` | Subtle dividers — copper-tinted, not neutral |
| `--border-strong` | `rgba(196,122,43,0.25)` | Visible borders, input outlines |

### Semantic Colors
| Purpose | Hex | Usage |
|---------|-----|-------|
| Success | `#6b8f5e` | Paid, completed, confirmed — muted olive, not neon |
| Warning | `#C47A2B` | Overdue, pending (matches accent intentionally) |
| Error | `#c44040` | Rejected, failed, expired — muted red, not alarming |
| Info | `#7a9cc6` | Links in context — muted steel blue |

### Structure
| Token | Value |
|-------|-------|
| `--radius` | `10px` — softened but not round, polished feel |
| `--shadow` | `0 2px 8px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4)` |

---

## 3. Typography

### Font Stack
```
--font-heading: 'Cormorant Garamond', Georgia, serif
--font-body:    'Inter', system-ui, -apple-system, sans-serif
--font-mono:    'Berkeley Mono', 'Fira Code', monospace
```

**High-contrast serif meets neutral sans.** Cormorant Garamond is a display Garamond with tall ascenders and fine hairlines — it demands space and rewards it. At 600 weight it carries authority without the heaviness of bold serifs. The slightly open tracking (+0.01em) is a luxury convention — premium brands let their letters breathe. Inter for body keeps data readable without competing.

### Type Scale
| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Page title | Cormorant Garamond | 24–28px | 600 | 0.01em |
| Section heading | Cormorant Garamond | 16–18px | 600 | 0.01em |
| Revenue display | Cormorant Garamond | 32–40px | 500 | 0.02em |
| Body | Inter | 13px | 400 | normal |
| Small body | Inter | 12px | 400 | normal |
| Caption | Inter | 11px | 400–500 | normal |
| Overline | Inter | 9–10px | 600 | 0.08em, uppercase |
| Mono | Berkeley Mono | 11–13px | 400 | normal |
| CTA button | Inter | 12–13px | 600 | 0.02em |

### Key Rules
- **Cormorant Garamond at 600, not 700.** Semibold preserves the hairline contrast that defines the typeface. Bold (700) fills in the thin strokes and kills the elegance.
- **Revenue numbers are display-sized.** AED figures, invoice totals, contract values — these use Cormorant Garamond at 32–40px. Large serif numbers are the Copper signature.
- **Tracking is OPEN on headings.** +0.01em to +0.02em. This is the opposite of Monolith's compression. Premium brands space their letters. The breathing room signals confidence.
- **Body text is warm.** `#a08060` is a muted gold, not gray. Even secondary text carries the warm palette.
- **CTA buttons use slightly open tracking.** 0.02em in Inter at 12px. Subtle, but it prevents buttons from feeling rushed.

---

## 4. Component Styling

### Cards / Surface Panels
```css
background: #1c1610;
border: 1px solid rgba(196,122,43,0.15);
border-radius: 10px;
padding: 18px 20px;
```

### Client Cards (CRM)
```css
background: #1c1610;
border: 1px solid rgba(196,122,43,0.12);
border-radius: 10px;
padding: 18px 20px;
/* Client name: Cormorant Garamond 18px 600 #f5ede0 */
/* Company: Inter 12px #a08060 */
/* Revenue tag: Cormorant Garamond 15px 500 #C47A2B */
/* Last contact: Inter 11px #6b5535 */
```

### Primary Button
```css
background: #C47A2B;
color: #120e0a;                     /* dark text on copper */
border-radius: 10px;
padding: 8px 20px;
font-family: 'Inter';
font-weight: 600;
font-size: 12px;
letter-spacing: 0.02em;
```

### Secondary / Ghost Button
```css
background: transparent;
border: 1px solid rgba(196,122,43,0.25);
color: #C47A2B;
border-radius: 10px;
padding: 8px 20px;
```

### Status Badges
```css
padding: 3px 10px;
border-radius: 8px;
font-size: 10px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.04em;

/* PAID */     background: rgba(107,143,94,0.15);  color: #6b8f5e;
/* PENDING */  background: rgba(196,122,43,0.12);  color: #C47A2B;
/* OVERDUE */  background: rgba(196,64,64,0.12);   color: #c44040;
/* DRAFT */    background: rgba(196,122,43,0.06);  color: #6b5535;
```

### Navigation — Active Item
```css
background: rgba(196,122,43,0.12);
color: #C47A2B;
font-weight: 500;
border-radius: 8px;
padding: 8px 14px;
/* Copper-tinted active — warm, not cold */
```

### Agent Chat Bubbles
```css
/* Agent */
background: #261e14;
border: 1px solid rgba(196,122,43,0.10);
border-radius: 4px 10px 10px 10px;

/* User */
background: rgba(196,122,43,0.10);
border: 1px solid rgba(196,122,43,0.18);
border-radius: 10px 4px 10px 10px;
```

### Revenue Display Card
```css
background: #1c1610;
border: 1px solid rgba(196,122,43,0.18);
border-radius: 10px;
padding: 24px;
text-align: center;
/* Currency: Inter 11px uppercase #6b5535 "AED" */
/* Amount: Cormorant Garamond 36px 500 #f5ede0 */
/* Change: Inter 11px — green for up, copper for flat */
```

### Invoice Row
```css
background: #1c1610;
border-bottom: 1px solid rgba(196,122,43,0.10);
padding: 14px 18px;
/* Client: Cormorant Garamond 15px 600 #f5ede0 */
/* Amount: Cormorant Garamond 15px 500 #C47A2B — right-aligned */
/* Status: pill badge, right of amount */
/* Date: Inter 11px #6b5535 */
```

### Client Relationship Timeline
```css
/* Timeline line: 1px rgba(196,122,43,0.15) vertical */
/* Event dot: 8px circle, #C47A2B for meetings, #6b8f5e for payments */
/* Event card: bg #261e14, 10px radius, copper border */
/* Event title: Inter 13px 500 #f5ede0 */
/* Event meta: Inter 11px #6b5535 */
```

---

## 5. Layout & Spacing

### Page Structure
```
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │ Main Content           │ Agent Panel  │
│ 240px    │ flex: 1                │ 360px        │
│ (or 60px │ padding: 28px 32px     │ (collapsible)│
│ compact) │                        │              │
└──────────┴────────────────────────┴──────────────┘
```

- **Sidebar:** 240px full (slightly wider — luxury breathes), 60px compact. Background: `--bg-surface` (#1c1610).
- **Main content:** Flexible. Padding: 28px 32px — generous for premium feel.
- **Agent Panel:** 360px. Right-docked. Background: `--bg-base` (#120e0a).
- **Top bar:** 56px height. Border-bottom: `--border`.

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| `gap-xs` | 4px | Inline elements, icon + text |
| `gap-sm` | 10px | Related items — slightly looser than default |
| `gap-md` | 14px | Card spacing, form fields |
| `gap-lg` | 20px | Section spacing, grid gaps |
| `gap-xl` | 28px | Major section breaks |
| `gap-2xl` | 40px | Page-level section gaps |

### Card Grid
- Revenue cards: 3- or 4-column flex, 16px gap.
- Invoice rows: Full-width, no gap (border-bottom separators).
- Client cards: 2-column at >=1280px, 1-column below. 16px gap.

---

## 6. Depth & Shadows

Copper shadows are deep and warm — no blue-black, no cool tones.

```css
/* Card at rest */
box-shadow: none;  /* copper-tinted border only */

/* Elevated surface (modals, dropdowns) */
box-shadow: 0 2px 8px rgba(0,0,0,0.5),
            0 8px 32px rgba(0,0,0,0.4);

/* Card hover */
box-shadow: 0 2px 12px rgba(0,0,0,0.4);

/* Active/focused card */
box-shadow: 0 0 0 3px rgba(196,122,43,0.20);

/* Agent online indicator */
box-shadow: 0 0 8px rgba(196,122,43,0.4);

/* Revenue number emphasis (hero stat) */
box-shadow: 0 0 40px rgba(196,122,43,0.08);
/* Subtle warm glow behind large AED figures */
```

---

## 7. Design Guardrails

### Do
- Use Cormorant Garamond for revenue numbers, client names, and headings ONLY. Never for body or labels.
- Display currency prominently. AED amounts in large serif (32px+). This is the Copper experience — money has visual weight.
- Keep the warm palette consistent. Every gray is warm. Every border is copper-tinted. Cold tones are foreign objects.
- Use 10px radius. Not as round as Indigo (12px), not as sharp as Monolith (6px). The goldilocks radius for luxury.
- Let the accent do less. Copper is a warm, muted accent — it doesn't shout like mint or indigo-violet. Use it sparingly for maximum effect.
- Track headings open (+0.01em). This is counter-intuitive for developers used to negative tracking. Luxury typography breathes.

### Don't
- Don't use cool colors. No blue accents, no cool grays, no mint. If it doesn't feel warm, it's wrong.
- Don't use neon or saturated semantic colors. Copper's success green is olive (#6b8f5e), not neon (#22c55e). Error is muted red (#c44040), not alarm red (#ef4444). Everything is desaturated.
- Don't show raw data tables. Copper is relational, not spreadsheet. Client views, timelines, and cards — not raw rows.
- Don't use compressed tracking on headings. That's Monolith. Copper tracks OPEN. If the heading looks tight, you're in the wrong theme.
- Don't use bg #000000 or #0a0a0a. The base is #120e0a — warm. Pure black kills the amber undertone.
- Don't skip the currency label. Revenue figures need "AED" or the appropriate currency prefix in small uppercase above or beside the number. Bare numbers lack context.
- Don't let agent tool calls dominate. In Copper, the agent is a concierge, not a mechanic. Collapse technical details by default.

---

## 8. Responsive Behavior

| Breakpoint | Sidebar | Agent Panel | Layout |
|------------|---------|-------------|--------|
| > 1280px | Full (240px) | Open (360px) | 3-column |
| 1024–1280px | Compact (60px) | Open (340px) | 2-column + panel |
| 768–1024px | Compact (60px) | Collapsed (toggle) | 2-column |
| < 768px | Hidden (drawer) | Full-screen overlay | 1-column |

On mobile, the Agent Panel becomes a full-screen overlay triggered by a floating button (bottom-right, #C47A2B, 48px circle, 10px radius, warm glow):
```css
box-shadow: 0 0 0 0 rgba(196,122,43,0.3);
animation: pulse 3s infinite;  /* slower pulse — luxury is unhurried */
```

---

## 9. AI Agent Prompts

### Copper Dashboard
> "Build a warm dark dashboard on bg #120e0a with burnished copper (#C47A2B) accent. Headings in Cormorant Garamond serif 600 at 24px with +0.01em tracking. Body in Inter 13px #a08060. Cards use bg #1c1610 with 10px border-radius and copper-tinted borders rgba(196,122,43,0.15). Sidebar at 240px on #1c1610. Agent panel at 360px right-docked. Revenue numbers: Cormorant Garamond 36px 500 in #f5ede0 with 'AED' prefix."

### Copper CRM View
> "Create a client relationship view on #120e0a. Client cards on #1c1610 with 10px radius and copper borders. Client name in Cormorant Garamond 18px 600 #f5ede0, company in Inter 12px #a08060. Revenue tag in Cormorant Garamond 15px #C47A2B. Timeline on right side: vertical copper line with event dots. Last contact in Inter 11px #6b5535. Include 'Schedule Meeting' button in #C47A2B."

### Copper Invoice View
> "Design an invoice list on #120e0a. Each row: client name in Cormorant Garamond 15px 600, amount in Cormorant Garamond 15px 500 #C47A2B right-aligned, status badge (PAID olive, PENDING copper, OVERDUE muted red). Bottom-border rgba(196,122,43,0.10). Summary cards at top: Total Revenue, Outstanding, Overdue — each with AED amounts in Cormorant Garamond 32px #f5ede0 on #1c1610 cards."

### Copper Agent Chat
> "Build a concierge-style chat panel on #120e0a. Agent messages: bg #261e14, copper border rgba(196,122,43,0.10), radius 4px 10px 10px 10px. User messages: bg rgba(196,122,43,0.10), border rgba(196,122,43,0.18), radius 10px 4px 10px 10px. Agent avatar: 22px rounded-square #C47A2B with 6px radius. Tool calls collapsed by default — show only result summary. Input bar: #1c1610 bg, copper border, 10px radius."

### Google Font Import
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap" rel="stylesheet">
```
