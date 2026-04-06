# SpokeStack — DESIGN.md

**Theme: Sage**
**Version:** 1.0 — April 2026

> Muted green, earthy editorial. The second light theme — built for sustainability brands, health/wellness, boutique creative studios, and teams that want calm authority without corporate coldness.

---

## 1. Visual Theme & Atmosphere

Pale sage canvas with warm green undertones. DM Serif Display headings carry editorial weight at regular weight (400) — they don't shout, they simply occupy the room. DM Sans body text is clean and friendly, slightly rounder than Inter. Forest green accent is muted enough to live with all day, saturated enough to direct attention. The two-font system (DM Serif + DM Sans) creates a warm editorial pairing that feels curated rather than constructed. This is the theme for teams that care about how things feel, not just how they function.

**Mood:** A workspace with plants and natural light. The brand deck is open. The copy is honest. The interface reflects the values.

**Reference points:** Aesop's editorial web (light mode), Patagonia's content pages, Notion in earthy tones, Kinfolk magazine's digital presence.

---

## 2. Color Palette

### Backgrounds (earthy whites)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#f4f6f2` | Page background — pale sage-white |
| `--bg-surface` | `#eceee8` | Cards, panels, sidebar — warm stone |
| `--bg-elevated` | `#ffffff` | Dropdowns, modals — pure white lifts |
| `--bg-hover` | `#e4e6e0` | Hover on interactive surfaces |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#1a2414` | Headings, primary content — deep forest |
| `--text-secondary` | `#5a6b52` | Body text, descriptions — muted green-gray |
| `--text-tertiary` | `#8a9982` | Placeholders, timestamps, disabled |

### Accent — Forest Green
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#3a6b35` | Primary action, links, active nav |
| `--accent-hover` | `#4a8040` | Hover — slightly brighter, more alive |
| `--accent-subtle` | `rgba(58,107,53,0.08)` | Tinted backgrounds, active nav bg, badges |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(58,107,53,0.12)` | Subtle dividers — green-tinted, not neutral |
| `--border-strong` | `rgba(58,107,53,0.20)` | Visible borders, input outlines |

### Semantic Colors
| Purpose | Hex | Usage |
|---------|-----|-------|
| Success | `#3a6b35` | Approved, published (matches accent — intentional) |
| Warning | `#a07830` | Pending, review needed — warm amber |
| Error | `#b04040` | Rejected, failed — muted brick red |
| Info | `#4a7a9a` | Links in context — muted teal-blue |

### Structure
| Token | Value |
|-------|-------|
| `--radius` | `12px` — soft, approachable, organic |
| `--shadow` | `0 1px 3px rgba(26,36,20,0.06), 0 4px 12px rgba(26,36,20,0.08)` |

---

## 3. Typography

### Font Stack
```
--font-heading: 'DM Serif Display', Georgia, serif
--font-body:    'DM Sans', Inter, system-ui, sans-serif
--font-mono:    'Berkeley Mono', 'Fira Code', monospace
```

**Two fonts, same design family.** DM Serif Display and DM Sans were designed as companions — their proportions, x-heights, and curves harmonize naturally. DM Serif Display at weight 400 (the only weight available) is authoritative without being heavy. DM Sans is slightly rounder and warmer than Inter, making body text feel approachable. This is Sage's distinguishing typographic choice: the body font itself is part of the personality, not just a neutral vehicle.

### Type Scale
| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Page title | DM Serif Display | 24–26px | 400 | -0.01em |
| Section heading | DM Serif Display | 16–18px | 400 | -0.01em |
| Body | DM Sans | 14px | 400 | normal |
| Small body | DM Sans | 12–13px | 400 | normal |
| Caption | DM Sans | 11px | 400–500 | normal |
| Overline | DM Sans | 10px | 500 | 0.06em, uppercase |
| Mono | Berkeley Mono | 12–13px | 400 | normal |
| CTA button | DM Sans | 13px | 500 | 0.01em |

### Key Rules
- **DM Serif Display is weight 400 only.** It ships with a single weight. Don't fake bold with `font-weight: 700` — it will fall back to Georgia bold, which breaks the visual.
- **DM Sans for body at 14px.** Sage is a reading theme. DM Sans at 14px with 1.6 line-height creates comfortable, unhurried scanning.
- **Tracking is minimal.** -0.01em on serif headings, normal on body. Sage doesn't compress or expand aggressively. The typography is at rest.
- **DM Sans replaces Inter for everything below headings.** Navigation labels, button text, badges, form inputs — all DM Sans. This warmth in utility text is what separates Sage from Canvas (which uses Inter for body).
- **Line-height: 1.65 for body.** The most generous line-height in the collection. Sage gives words room to land.

---

## 4. Component Styling

### Cards / Surface Panels
```css
background: #eceee8;
border: 1px solid rgba(58,107,53,0.12);
border-radius: 12px;
padding: 18px 20px;
```

### Cards on Elevated (modal context)
```css
background: #ffffff;
border: 1px solid rgba(58,107,53,0.10);
border-radius: 12px;
box-shadow: 0 1px 3px rgba(26,36,20,0.06),
            0 4px 12px rgba(26,36,20,0.08);
```

### Primary Button
```css
background: #3a6b35;
color: #ffffff;
border-radius: 12px;
padding: 10px 20px;
font-family: 'DM Sans';
font-weight: 500;
font-size: 13px;
letter-spacing: 0.01em;
```

### Secondary / Ghost Button
```css
background: transparent;
border: 1px solid rgba(58,107,53,0.20);
color: #3a6b35;
border-radius: 12px;
padding: 10px 20px;
```

### Status Badges
```css
padding: 3px 10px;
border-radius: 8px;
font-family: 'DM Sans';
font-size: 10px;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.04em;

/* ACTIVE */    background: rgba(58,107,53,0.10);  color: #3a6b35;
/* PENDING */   background: rgba(160,120,48,0.10); color: #a07830;
/* ARCHIVED */  background: rgba(0,0,0,0.04);       color: #8a9982;
/* URGENT */    background: rgba(176,64,64,0.08);   color: #b04040;
```

### Navigation — Active Item
```css
background: rgba(58,107,53,0.08);
color: #3a6b35;
font-family: 'DM Sans';
font-weight: 500;
border-radius: 10px;
padding: 8px 14px;
```

### Agent Chat Bubbles
```css
/* Agent */
background: #ffffff;
border: 1px solid rgba(58,107,53,0.10);
border-radius: 4px 12px 12px 12px;
box-shadow: 0 1px 2px rgba(26,36,20,0.04);

/* User */
background: rgba(58,107,53,0.08);
border: 1px solid rgba(58,107,53,0.14);
border-radius: 12px 4px 12px 12px;
```

### Team Member Card
```css
background: #ffffff;
border: 1px solid rgba(58,107,53,0.10);
border-radius: 12px;
padding: 18px 20px;
/* Avatar: 40px circle, natural photo or initials on sage bg */
/* Name: DM Serif Display 16px 400 #1a2414 */
/* Role: DM Sans 12px #5a6b52 */
/* Status: green dot + "Available" in DM Sans 11px */
/* Skills: pill tags on rgba(58,107,53,0.06) bg, 999px radius */
```

### Survey / Feedback Card
```css
background: #ffffff;
border: 1px solid rgba(58,107,53,0.10);
border-radius: 12px;
padding: 20px 24px;
/* Question: DM Serif Display 17px 400 #1a2414 */
/* Options: DM Sans 14px, radio/checkbox with green accent */
/* Progress bar: 4px tall, bg #eceee8, fill #3a6b35, 999px radius */
/* Submit: primary button bottom-right */
```

### Marketplace / Listing Card
```css
background: #ffffff;
border: 1px solid rgba(58,107,53,0.08);
border-radius: 12px;
overflow: hidden;
/* Image area: 100% width, 160px height, object-fit cover */
/* Content padding: 16px 18px */
/* Title: DM Serif Display 15px 400 #1a2414 */
/* Description: DM Sans 13px #5a6b52, 2-line clamp */
/* Price/CTA: bottom row, DM Sans 13px 500 #3a6b35 */
/* Tag pills: top-right overlay, bg rgba(255,255,255,0.9), 999px radius */
```

---

## 5. Layout & Spacing

### Page Structure
```
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │ Main Content           │ Agent Panel  │
│ 240px    │ flex: 1                │ 340px        │
│ (or 56px │ padding: 28px 32px     │ (collapsible)│
│ compact) │                        │              │
└──────────┴────────────────────────┴──────────────┘
```

- **Sidebar:** 240px full, 56px compact. Background: `--bg-surface` (#eceee8).
- **Main content:** Flexible. Padding: 28px 32px — generous, like Canvas. Light themes need whitespace.
- **Agent Panel:** 340px. Right-docked. Background: `--bg-base` (#f4f6f2).
- **Top bar:** 52px height. Border-bottom: `--border`.

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| `gap-xs` | 4px | Inline elements, icon + text |
| `gap-sm` | 8px | Related items, badge groups |
| `gap-md` | 14px | Card spacing, form fields |
| `gap-lg` | 20px | Section spacing, grid gaps |
| `gap-xl` | 28px | Major section breaks |
| `gap-2xl` | 36px | Page-level section gaps |

### Card Grid
- Team cards: 3-column wrap at 280px, 16px gap.
- Marketplace listings: 3- or 4-column masonry-like grid, 16px gap.
- Survey/form: Single column, max-width 640px, centered. 14px gap between fields.

---

## 6. Depth & Shadows

Sage shadows are green-tinted — matching the earthy palette.

```css
/* Card at rest */
box-shadow: 0 1px 2px rgba(26,36,20,0.04);  /* barely there */

/* Elevated surface (modals, dropdowns) */
box-shadow: 0 1px 3px rgba(26,36,20,0.06),
            0 4px 12px rgba(26,36,20,0.08);

/* Card hover */
box-shadow: 0 2px 8px rgba(26,36,20,0.08);

/* Active/focused card */
box-shadow: 0 0 0 3px rgba(58,107,53,0.15);

/* Floating action button */
box-shadow: 0 2px 8px rgba(26,36,20,0.12);

/* Modal backdrop */
background: rgba(26,36,20,0.15);  /* green-tinted, not neutral black */
```

---

## 7. Design Guardrails

### Do
- Use DM Serif Display ONLY for headings. It has one weight (400). Accept it. Don't try to make it bold.
- Use DM Sans for ALL non-heading text. Navigation, buttons, badges, body, captions. The warm sans-serif is Sage's distinguishing utility typeface.
- Keep radius at 12px on cards and buttons. Sage and Indigo share the soft radius, but Sage's light palette and green tint make it feel entirely different.
- Tint borders and shadows with green. `rgba(58,107,53,...)` for borders, `rgba(26,36,20,...)` for shadows. Neutral grays break the earthy identity.
- Let content breathe. 14px body, 1.65 line-height, generous padding. Sage is the most spacious theme in the collection.
- Show people. Team photos, avatars, contributor names. Sage is about human connection, not data density.

### Don't
- Don't use Inter for body text. DM Sans is the Sage body font. Swapping in Inter strips the warmth and makes Sage feel like a green Canvas.
- Don't fake bold on DM Serif Display. `font-weight: 700` will trigger Georgia bold fallback, which is visually jarring. The regular weight IS the design.
- Don't use pure black text. `#1a2414` (deep forest) is the darkest text. Pure black (`#000000`) on the sage background creates harsh contrast.
- Don't use saturated neon colors for status. Sage's semantic palette is muted: olive green, warm amber, brick red. Neon status colors clash with the earthy canvas.
- Don't compress typography. No negative tracking on body. No 12px body text. Sage is generous by design — density undermines it.
- Don't hide the team. On themes like Monolith or Volt, interfaces are about the system. On Sage, interfaces are about the people using the system.
- Don't use gray-blue (#f5f5f5) for surfaces. Sage surfaces are `#eceee8` (warm stone) and `#f4f6f2` (pale sage). Cool grays break the organic feel.

---

## 8. Responsive Behavior

| Breakpoint | Sidebar | Agent Panel | Layout |
|------------|---------|-------------|--------|
| > 1280px | Full (240px) | Open (340px) | 3-column |
| 1024–1280px | Compact (56px) | Open (340px) | 2-column + panel |
| 768–1024px | Compact (56px) | Collapsed (toggle) | 2-column |
| < 768px | Hidden (drawer) | Full-screen overlay | 1-column |

On mobile, the Agent Panel becomes a full-screen overlay triggered by a floating button (bottom-right, #3a6b35, 48px circle, 12px radius, green-tinted shadow):
```css
box-shadow: 0 2px 8px rgba(58,107,53,0.20);
```
No aggressive pulse. Sage uses a gentle opacity fade:
```css
animation: breathe 4s ease-in-out infinite;  /* slowest in the collection */
@keyframes breathe {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
}
```

---

## 9. AI Agent Prompts

### Sage Dashboard
> "Build a light earthy dashboard on bg #f4f6f2 with forest green (#3a6b35) accent. Headings in DM Serif Display 400 at 24px with -0.01em tracking. Body in DM Sans 14px #5a6b52, line-height 1.65. Cards use bg #eceee8 with 12px border-radius and green-tinted borders rgba(58,107,53,0.12). Sidebar at 240px on #eceee8. Agent panel at 340px right-docked on #f4f6f2. Elevated surfaces use #ffffff with shadow 0 4px 12px rgba(26,36,20,0.08)."

### Sage Team View
> "Create a team grid on #f4f6f2. Member cards on #ffffff with 12px radius and green-tinted borders. Avatar: 40px circle. Name in DM Serif Display 16px 400 #1a2414. Role in DM Sans 12px #5a6b52. Status: green dot + 'Available' label. Skill tags: pill badges on rgba(58,107,53,0.06) bg, DM Sans 10px #3a6b35. 3-column grid, 16px gap."

### Sage Survey / Feedback
> "Design a survey form on #f4f6f2, max-width 640px centered. Question text in DM Serif Display 17px 400 #1a2414. Options in DM Sans 14px with radio buttons. Selected option: green ring (#3a6b35). Progress bar: 4px tall, bg #eceee8, fill #3a6b35, 999px radius. Submit button: bg #3a6b35, DM Sans 13px 500, 12px radius. Card wrapper: #ffffff, 12px radius, 20px 24px padding."

### Sage Marketplace
> "Build a marketplace grid on #f4f6f2. Listing cards: #ffffff, 12px radius, overflow hidden. Image area 160px, content area 16px 18px padding. Title in DM Serif Display 15px #1a2414. Description in DM Sans 13px #5a6b52, 2-line clamp. Price in DM Sans 13px 500 #3a6b35. Tag pills: rgba(255,255,255,0.9) bg, 999px radius, overlaid on image. Hover lifts card with shadow 0 2px 8px rgba(26,36,20,0.08)."

### Sage Agent Chat
> "Build an earthy chat panel on #f4f6f2. Agent messages: bg #ffffff, 1px border rgba(58,107,53,0.10), radius 4px 12px 12px 12px, subtle shadow. User messages: bg rgba(58,107,53,0.08), border rgba(58,107,53,0.14), radius 12px 4px 12px 12px. Agent avatar: 20px rounded-square #3a6b35 with 6px radius. All text in DM Sans. Input bar: #eceee8 bg, green border, 12px radius."

### Google Font Import
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
```
