# SpokeStack Theme System — Index

Every SpokeStack workspace can apply one of 7 curated themes. Each theme has a complete DESIGN.md spec that any AI agent can read to generate pixel-perfect UI in that theme's style.

## How It Works

1. Theme is stored in `OrgSettings.branding.theme` per organization
2. A `data-theme` attribute on `<html>` swaps 14 CSS variable tokens
3. All components use CSS variables — no hardcoded colors
4. Theme-specific fonts load conditionally (only the active theme's fonts)
5. Theme applies instantly on selection — no page reload

## The 7 Themes

| Theme | DESIGN.md | Palette | Font | Radius | Best For |
|-------|-----------|---------|------|--------|----------|
| **Obsidian** (default) | [DESIGN.md](./DESIGN.md) | Dark, violet accent | Inter | 8px | Dev agencies, tech-forward |
| **Volt** | [DESIGN.volt.md](./DESIGN.volt.md) | Black, electric mint | Space Grotesk + Inter | 4px | Creative/digital agencies |
| **Indigo** | [DESIGN.indigo.md](./DESIGN.indigo.md) | Deep navy, violet | Fraunces + Inter | 12px | PR/comms, MENA professional |
| **Canvas** | [DESIGN.canvas.md](./DESIGN.canvas.md) | Warm white, blue | Lora + Inter | 8px | Content studios, consultancies |
| **Monolith** | [DESIGN.monolith.md](./DESIGN.monolith.md) | Stark white/black | Geist | 6px | SaaS, dev tools, product co's |
| **Copper** | [DESIGN.copper.md](./DESIGN.copper.md) | Warm dark, amber | Cormorant Garamond + Inter | 10px | Luxury, finance, legal, UAE |
| **Sage** | [DESIGN.sage.md](./DESIGN.sage.md) | Muted green, earthy | DM Serif Display + DM Sans | 12px | Sustainability, wellness, editorial |

## Theme Selection Rules

- **Dark themes:** Obsidian, Volt, Indigo, Copper (4)
- **Light themes:** Canvas, Monolith, Sage (3)
- **Serif heading themes:** Indigo (Fraunces), Canvas (Lora), Copper (Cormorant Garamond), Sage (DM Serif Display)
- **Sans heading themes:** Obsidian (Inter), Volt (Space Grotesk), Monolith (Geist)

## CSS Variable Tokens (14 per theme)

Every theme defines these exact 14 tokens plus typography variables:

```css
/* Backgrounds */
--bg-base          /* page background */
--bg-surface       /* cards, panels */
--bg-elevated      /* dropdowns, modals */
--bg-hover         /* hover state */

/* Text */
--text-primary     /* headings, main content */
--text-secondary   /* body, descriptions */
--text-tertiary    /* placeholders, disabled */

/* Accent */
--accent           /* buttons, links, active */
--accent-hover     /* hover on accent */
--accent-subtle    /* tinted backgrounds */

/* Structure */
--border           /* subtle dividers */
--border-strong    /* visible borders */
--radius           /* component border radius */
--shadow           /* elevation shadow */

/* Typography */
--font-heading
--font-body
--font-mono
--tracking-heading
--weight-heading
```

## Using DESIGN.md Files

Each DESIGN.md is self-contained. Copy the file for your theme into any project and instruct your AI agent:

```
"Read DESIGN.md and build me a [page type] that matches this design system exactly."
```

The AI prompts section (Section 9) in each file provides ready-to-use prompts for common page types: dashboards, task lists, agent chat panels, module cards, landing pages, and more.
