# Design System — Rare Bird Alerts

## Aesthetic

**"Field Journal"** — warm parchment, quiet ruled dividers, italic serif species names, monospace coordinates. A beautifully kept paper notebook that happens to be a live web app. Charming, unhurried, never clinical.

Inspired by: Wingspan board game, Sibley field guides.

---

## Color

```css
:root {
  --bg-base: #f5f0e8;       /* parchment */
  --bg-surface: #fdf8f0;    /* card surface */

  --clr-rust: #c4622d;      /* primary — terracotta */
  --clr-sage: #5a7a5c;      /* secondary — forest */
  --clr-gold: #d4943a;      /* highlight — golden hour */
  --clr-sky: #4a7fa5;       /* data — field-guide blue */
  --clr-berry: #7b3f6e;     /* rare alerts — deep berry */

  --text-primary: #2c2416;
  --text-secondary: #6b5a3e;
  --text-muted: #a08c6e;

  --border: #d4c4a8;

  --shadow-sm: 2px 3px 8px rgba(44, 36, 22, 0.1);
  --shadow-md: 4px 6px 16px rgba(44, 36, 22, 0.15);
}
```

- `--clr-berry` for rare alerts only — it should feel special
- `--clr-rust` for primary actions and species names
- `--clr-gold` for hover states and counts
- Shadows are always warm-tinted, never cold gray

---

## Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');

--font-display: 'Playfair Display', Georgia, serif;  /* headlines, species names */
--font-body: 'Lora', Georgia, serif;                 /* all body text */
--font-data: 'DM Mono', monospace;                   /* coords, timestamps, counts */
```

- Species names: `--font-display`, italic, `--clr-rust`
- Timestamps/coordinates: `--font-data`, `--text-muted`
- Never use sans-serif for body text

---

## Components

**Alert cards:** `--bg-surface`, left border 3px in rarity color, `border-radius: 2px 6px 6px 2px`, `--shadow-sm`. Hover lifts `translateY(-2px)`. Rarity badge is small, understated, mono-font — not the visual focus.

**Rarity colors:** rare → `--clr-berry`, uncommon → `--clr-gold`, notable → `--clr-sage`, recent → `--clr-rust`

**Stat counters:** Large bare number in `--font-display`, small italic label below in `--font-body`. No box or container — let them breathe. Separated by thin 1px vertical dividers.

**Section dividers:** 1px horizontal rule in `--border` only. A centered decorative character (e.g. `·`) is fine for charm.

---

## Rules

- Light mode only — warm parchment throughout, no dark backgrounds
- Alert feed is a vertical stack, full-width cards — never a grid
- Rarity via left border only — no top borders, no large badges
- Stat numbers are never boxed
- No Inter, Roboto, Arial, or system fonts
- No cold gray shadows, no purple gradients, no SaaS chrome
