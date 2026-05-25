# Design System — MYE030 Data Integration & Visualization Platform

The frontend is laid out like the digital edition of an academic
journal: serif headlines on Inter body copy, generous whitespace,
warm paper-toned neutrals, and a navy accent. No glassmorphism,
no neon, no gradient walls. The visualisations carry the visual
weight; the surrounding chrome stays out of the way.

---

## Table of contents

1. [Philosophy](#1-philosophy)
2. [Reference sites](#2-reference-sites)
3. [Colour palette](#3-colour-palette)
4. [Typography](#4-typography)
5. [Spacing and layout grid](#5-spacing-and-layout-grid)
6. [Elevation, borders, radius](#6-elevation-borders-radius)
7. [Motion](#7-motion)
8. [Iconography](#8-iconography)
9. [Components](#9-components)
10. [Charts](#10-charts)
11. [Page templates](#11-page-templates)
12. [Tailwind tokens](#12-tailwind-tokens)
13. [Accessibility](#13-accessibility)
14. [Don'ts](#14-donts)

---

## 1. Principles

1. **Page layout follows the article metaphor.** Each route uses a
   title, lede, body, figure, caption sequence rather than a
   dashboard grid.
2. **Hierarchy comes from typography, not from cards.** Crimson Pro
   serif headlines on Inter body copy; borders and surfaces stay
   minimal.
3. **Background is warm cream `#F5F1E8`**, not pure white.
4. **Numeric tiles use JetBrains Mono** so digits align column-wise.
5. **Accents (ochre, oxblood) are reserved for state**: active route,
   destructive action, peak bar in a chart. They are not used as
   decoration.

---

## 2. Reference sites

These are the touchstones for visual decisions. When in doubt, look
here before inventing.

| Reference | What to copy | What to ignore |
|---|---|---|
| The Pudding (pudding.cool) | Editorial hierarchy, generous lede, captions under figures | Their hand-illustrated headers |
| Our World in Data | Restraint, table-of-contents sidebar, chart annotations | Their bright primary colours |
| Bloomberg's Markets section | Dense numeric tables in monospace, ticker-style deltas | Their black-on-grey palette |
| Stripe Press (press.stripe.com) | Cover-style hero, serif typography, ample whitespace | Their book-cart commerce flow |
| The Browser Company / Arc release notes | Quiet card design, type-driven hierarchy | Their playful illustrations |
| Linear's changelog | Restrained motion, focused colour use | Their dark theme |
| Bookshop.org | Library-style category navigation, beige palette | Their commerce widgets |

---

## 3. Colour palette

### 3.1 Core neutrals

| Name | Hex | Usage |
|---|---|---|
| Cream | `#F5F1E8` | Page background — the canvas |
| Parchment | `#E8E2D5` | Card / panel background (one shade darker than page) |
| Linen | `#DCD4C2` | Hover background on parchment surfaces |
| Ink | `#1A1A1A` | Body text on cream |
| Slate | `#3A3A3A` | Secondary body text |
| Smoke | `#8A857A` | Captions, table headers, axis labels |
| Hairline | `#C8C0AE` | Borders, table dividers, chart gridlines |

### 3.2 Accent palette

| Name | Hex | Semantic role |
|---|---|---|
| Navy | `#14213D` | Primary action, headings, active link, chart series 1 |
| Ochre | `#A88B4A` | Hover, focused link, chart series 2 |
| Oxblood | `#6B2737` | Destructive action, peak/outlier highlight, chart series 3 |
| Sage | `#4F6F4E` | Success, matched entity badge, chart series 4 |
| Sky | `#5B7B8C` | Tertiary information, chart series 5 |
| Wheat | `#C9A961` | Warning, missing-data badge, chart series 6 |

### 3.3 Application rules

- **Backgrounds:** Cream → Parchment → Linen (page → card → hover).
  Never use pure `#FFFFFF`. Never use pure `#000000`.
- **Text on cream:** Ink for body, Slate for secondary, Smoke for
  captions and axis labels.
- **Text on navy:** Cream `#F5F1E8` (not white).
- **Borders:** Hairline `#C8C0AE`, 1 px, never thicker.
- **Selection / focus ring:** Ochre `#A88B4A` at 40% alpha,
  2 px outline offset 2 px.
- **Disabled state:** Smoke text on Linen background, no opacity hack.

### 3.4 Chart palette

Series order (deterministic, regardless of underlying data):

```
1. Navy      #14213D
2. Ochre     #A88B4A
3. Oxblood   #6B2737
4. Sage      #4F6F4E
5. Sky       #5B7B8C
6. Wheat     #C9A961
```

When more than six series are needed (rare — usually the chart should
be split or filtered instead), repeat from index 1 with 60% alpha.
Never auto-generate a colour scale from `d3.scaleSequential` — that
breaks the visual identity.

For diverging scales (Spearman correlation, deltas), use a custom two-
stop ramp from Oxblood `#6B2737` through Cream `#F5F1E8` to Sage
`#4F6F4E`.

---

## 4. Typography

### 4.1 Families

| Family | Where | Weight range |
|---|---|---|
| Crimson Pro | Headings (H1–H4), display numerals on the landing hero, blockquotes | 400, 600 |
| Inter | Body, UI controls, form labels, navigation, table cells | 400, 500, 600 |
| JetBrains Mono | Metric tiles, KPI numerals, table numeric cells, code, identifiers | 400, 500 |

Load via Google Fonts in `index.html` with `display=swap`. Subset to
Latin + Greek + Latin-Ext (the project's data contains French, German,
Italian, occasional Greek author names).

### 4.2 Scale

A modular scale of 1.25 (major third), rooted at 16 px body.

| Token | Size | Line-height | Letter-spacing | Family | Used for |
|---|---|---|---|---|---|
| `text-display`  | 64 px / 4 rem    | 1.05 | -0.02em | Crimson Pro 400 | Landing hero |
| `text-h1`       | 48 px / 3 rem    | 1.1  | -0.015em | Crimson Pro 600 | Page title |
| `text-h2`       | 36 px / 2.25 rem | 1.15 | -0.01em  | Crimson Pro 600 | Section heading |
| `text-h3`       | 28 px / 1.75 rem | 1.2  | -0.005em | Crimson Pro 600 | Sub-section |
| `text-h4`       | 22 px / 1.375 rem| 1.25 | 0        | Crimson Pro 600 | Card title |
| `text-lede`     | 20 px / 1.25 rem | 1.5  | 0        | Crimson Pro 400 italic | Page intro paragraph |
| `text-body`     | 16 px / 1 rem    | 1.6  | 0        | Inter 400 | Paragraph copy |
| `text-body-sm`  | 14 px / 0.875 rem| 1.55 | 0        | Inter 400 | Secondary copy |
| `text-caption`  | 12 px / 0.75 rem | 1.4  | 0.02em   | Inter 500 uppercase | Table headers, axis labels |
| `text-metric`   | 40 px / 2.5 rem  | 1.0  | -0.01em  | JetBrains Mono 500 | KPI tile numeral |
| `text-metric-sm`| 22 px / 1.375 rem| 1.0  | 0        | JetBrains Mono 500 | Inline counts |
| `text-mono`     | 14 px / 0.875 rem| 1.55 | 0        | JetBrains Mono 400 | Identifiers, IDs, URL slugs |

### 4.3 Hierarchy rules

- One `text-display` or `text-h1` per page. Never two H1s.
- Headings keep 1.5 × their own font-size of margin-top, 0.5 × of
  margin-bottom. (No collapsing margins workaround needed.)
- Body paragraphs cap at **66 characters per line** (`max-width: 33rem`).
  Anything wider is unreadable.
- Italic Crimson Pro is the *only* italic in the system. Never italic
  Inter, never italic JetBrains Mono.

### 4.4 Numerals

- All counts, sizes, years, percentages, durations: JetBrains Mono with
  **tabular-nums** so columns align in tables.
- All inline numbers within body prose stay in Inter (because the eye
  expects them there). Switch families only when numbers are the
  subject, not part of a sentence.

---

## 5. Spacing and layout grid

### 5.1 Spacing scale

8 px base, doubling at each step. Tailwind defaults align with this.

| Token | Value | Where |
|---|---|---|
| `space-1` | 4 px  | Icon-to-text padding |
| `space-2` | 8 px  | Tight stack |
| `space-3` | 12 px | Form fields vertical rhythm |
| `space-4` | 16 px | Component padding (cards, buttons) |
| `space-6` | 24 px | Component group separator |
| `space-8` | 32 px | Section internal padding |
| `space-12`| 48 px | Section separator |
| `space-16`| 64 px | Page block separator |
| `space-24`| 96 px | Hero vertical padding |

### 5.2 Container widths

| Container | Max width | Used for |
|---|---|---|
| `prose` | 720 px | Landing intro, page lede, single-column reading |
| `default` | 1120 px | Dashboard, profile, list pages |
| `wide` | 1360 px | Charts page, multi-panel comparisons |
| `full` | 100% with 32 px gutters | Reserved; do not use yet |

Centred via `mx-auto` with horizontal padding `px-6` (mobile) /
`px-12` (desktop).

### 5.3 Section rhythm

A page consists of stacked **sections**. Each section has:

- `space-12` margin-top to the previous section.
- An optional `text-caption` eyebrow (one line, uppercase, Smoke).
- A `text-h2` heading.
- Optional `text-body-sm` description line.
- Content block.
- An optional bottom rule (`border-t border-hairline`) before the
  next section.

---

## 6. Elevation, borders, radius

### 6.1 Elevation

Almost flat. The library doesn't have drop shadows on its book pages.

| Level | Shadow | Where |
|---|---|---|
| 0 | none | Page surfaces, cards |
| 1 | `0 1px 0 0 #C8C0AE` (hairline beneath) | Navbar bottom, table-header bottom |
| 2 | `0 4px 12px rgba(20, 33, 61, 0.06)` | Dropdown menus, Cmd+K palette, tooltips |
| 3 | `0 12px 32px rgba(20, 33, 61, 0.12)` | Dialogs, modal sheets |

No level above 3. No coloured shadows other than Navy.

### 6.2 Borders

- Default border: `1px solid #C8C0AE` (Hairline).
- Focus border: replace with `2px solid #A88B4A` (Ochre) and add the
  4 px offset focus ring.
- Error border: `1px solid #6B2737` (Oxblood) plus an oxblood helper
  text line below the field.

### 6.3 Border radius

| Token | Value | Where |
|---|---|---|
| `radius-none` | 0    | Tables, table cells, dividers |
| `radius-xs`   | 2 px | Badges, tag chips |
| `radius-sm`   | 4 px | Inputs, buttons, cards |
| `radius-md`   | 6 px | Dialogs, panels |

Anything rounder than 6 px would look like a SaaS dashboard. We are
not a SaaS dashboard. Avatars are still circular by exception.

---

## 7. Motion

Conservative. Animations exist to explain a change, never to delight.

| Movement | Duration | Easing | Used for |
|---|---|---|---|
| Fade | 150 ms | `ease-out` | Tooltip, dropdown, dialog open |
| Slide-up 8 px + fade | 200 ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Cmd+K palette, snackbar |
| Chart redraw | 400 ms | `ease-in-out` | Axis transitions, filter changes |
| Page transitions | none | — | Router swaps content instantly |

Hover transitions on links and buttons: `transition: color 100ms` and
`background-color 100ms`. Never transition layout properties (width,
height, top, left).

`prefers-reduced-motion: reduce` collapses all of the above to zero
duration except chart redraws (which become instant frame swaps).

---

## 8. Iconography

- Library: **Lucide React** (`lucide-react`).
- Stroke width 1.5 (the default 2 reads too heavy on cream).
- Sizing tokens:

  | Token | Size | Where |
  |---|---|---|
  | `icon-xs` | 14 px | Inline next to body text |
  | `icon-sm` | 16 px | Buttons, form affordances |
  | `icon-md` | 20 px | Navbar, primary actions |
  | `icon-lg` | 24 px | Empty-state illustrations |

- Colour matches surrounding text — never a custom icon colour.
- Decorative icons are forbidden. If an icon doesn't help comprehension,
  remove it.

---

## 9. Components

The frontend builds on **shadcn/ui** + **Tailwind**. shadcn ships
components as source, so each one gets restyled to fit the system.

### 9.1 Button

Variants:

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| `primary` | Navy | Cream | none | Main CTA, "Apply filters" |
| `secondary` | Cream | Navy | 1px Navy | Cancel, secondary action |
| `tertiary` | transparent | Navy | none | Inline text actions ("Reset", "Clear") |
| `destructive` | Oxblood | Cream | none | Destructive confirmations |
| `ghost` | transparent | Ink | none | Toolbar icons, navbar items |

Sizes: `sm` (32 px height, 12 px H-padding), `md` (40 px, 16 px),
`lg` (48 px, 20 px). Default is `md`.

Hover: shift background by one shade (`hover:bg-navy/90` for primary,
`hover:bg-linen` for secondary). No scale transforms, no shadow lifts.

### 9.2 Input / form field

- Background: Cream, border Hairline, text Ink.
- Height 40 px, padding 12 px H, 8 px V.
- Label sits above the field in `text-caption` (uppercase, Smoke).
- Helper / error text below in `text-body-sm`.
- Disabled state: Linen background, Smoke text, no opacity hack.

### 9.3 Card

- Background Parchment, border 1 px Hairline, radius `radius-sm`.
- Internal padding `space-6`.
- Title in `text-h4` Crimson Pro, optional eyebrow in `text-caption`.
- Cards never sit on cards. Maximum two levels of surface depth.

### 9.4 Table

- Cell padding `8px 12px`.
- Border-radius **none** — tables are flat by definition.
- Header row: `text-caption` uppercase, Smoke text, Hairline border-
  bottom (no fill).
- Body rows: alternating background `transparent` / `#EFEAD8` (between
  Cream and Parchment) for zebra striping. Subtle, not loud.
- Numeric cells right-aligned, JetBrains Mono `tabular-nums`.
- Hover row: Linen background.
- Sort indicator: tiny Lucide `ArrowUp`/`ArrowDown` icon, 12 px, in
  the header cell.

### 9.5 Badge / tag

- Background: a 10 %-alpha variant of the matching accent.
- Border: 1 px solid of the same accent.
- Text: the accent colour at full strength, `text-caption`, uppercase.
- Radius `radius-xs`.
- Use sparingly. A page with five badges is two badges too many.

### 9.6 Tabs

- Underlined tabs, never pill-shaped.
- Inactive: `text-body-sm` Slate.
- Active: same size and family, Navy, with a 2 px Navy underline.
- Tab bar separator: 1 px Hairline beneath the whole row.

### 9.7 Cmd+K command palette

Built on **cmdk** + the shadcn `Command` wrapper.

- Triggered by `⌘K` (macOS) / `Ctrl+K` (Windows) globally.
- Overlay: a `radius-md` dialog floated 25 % from the top, max-width
  640 px, elevation 3.
- Input row: large, 48 px tall, no border, only a Hairline divider
  beneath. Placeholder "Search authors, journals, conferences…".
- Result groups: "Authors", "Journals", "Conferences", "Years",
  "Pages". Each group header in `text-caption` uppercase Smoke.
- Result row: 40 px tall, with a Lucide icon on the left, the title
  in Inter 500, and a Smoke right-aligned hint (matched venue type,
  rank, etc.).
- Keyboard hints in the footer ("↑↓ to navigate, ↵ to open, esc to
  close") in `text-caption`.
- Fuzzy search via cmdk's built-in scorer, but driven by `/search` on
  the backend (debounced 200 ms) for live data.

### 9.8 Tooltip

- 12 px text, Cream background, Hairline border, elevation 2.
- Max-width 280 px.
- Appears after 600 ms hover, dismisses instantly on mouseleave.

### 9.9 Empty state

- Centred block within the container.
- Lucide icon `icon-lg` in Smoke.
- One-line headline in `text-h4`.
- One-line description in `text-body-sm` Slate.
- Optional secondary-button action.

### 9.10 Loading state

- Tables: skeleton rows with `bg-linen` shimmer, four rows by default.
- Charts: a `text-caption` "Loading…" label centred on the chart's
  canvas with a `bg-parchment` overlay at 60 % alpha.
- KPI tiles: hyphen (`—`) placeholder in JetBrains Mono.

### 9.11 Error state

- Inline error card on top of the failing section.
- Oxblood `1px` border, Parchment background.
- Lucide `AlertCircle` icon, the localized message, and a "Retry"
  tertiary button.
- The RFC 7807 problem-details `title` becomes the card headline; the
  `detail` becomes the description.

---

## 10. Charts

Built with **Visx** (D3 primitives wrapped as React components). One
chart per `<figure>`, each with a `<figcaption>` underneath in
`text-body-sm` Slate.

### 10.1 Required chart types

| Type | Visx primitives | Use case (per brief) |
|---|---|---|
| Line chart | `LinePath`, `AxisBottom`, `AxisLeft` | Indicator over time |
| Bar chart | `Bar`, `BarGroup` | Compare totals across categories |
| Scatter plot | `Circle`, `AxisBottom`, `AxisLeft` | Two-metric correlation |

The brief explicitly asks for these three. Three additional variants
(stacked bar, multi-series line, faceted scatter) come from filter
combinations — they use the same primitives.

### 10.2 Chart anatomy

```
margin-top    24 px        ← caption space
margin-right  16 px
margin-bottom 40 px        ← x-axis label
margin-left   56 px        ← y-axis label and tick labels
```

- Axis line: 1 px Hairline.
- Tick marks: 1 px Hairline, 4 px long, outside the plot area.
- Tick labels: `text-caption` Smoke.
- Gridlines: 1 px Hairline at 10 % alpha — visible but not loud.
- Axis title: `text-body-sm` Slate, rotated for Y axis.
- Series colours: from §3.4 in series order.
- Data point markers (scatter): 4 px radius, 1 px Cream stroke, 60 %
  alpha fill. Hovered point grows to 6 px and snaps to 100 % alpha.

### 10.3 Annotations

- Peak / outlier marker: small Oxblood dot + a leader line + a
  `text-caption` label.
- Reference line (e.g. mean): 1 px dashed Smoke + a right-aligned
  label.
- Brushing: a Linen-filled rectangle with a 1 px Navy border.

### 10.4 Interactions

- Tooltip on hover: shows series name, X value, Y value. Stays inside
  the chart bounds (auto-flip to the left of the cursor near the right
  edge).
- Click on a bar / line marker: navigates to the relevant profile
  page (TanStack Router push). The cursor is `pointer` when this is
  available; default otherwise.
- Filter changes animate via `react-transition-group` for the
  axis ticks, but the lines themselves rerender — never tween the
  data.

### 10.5 Chart export

- A `<button>` per chart titled "Download CSV" lives below the
  caption. It calls the same endpoint with `?format=csv`.
- A "Download PNG" button uses `html-to-image` to snapshot the SVG
  for screenshots. Stretch goal — ship Phase 1 without it.

---

## 11. Page templates

The 13 pages collapse into 5 templates:

### 11.1 Landing

```
┌──────────────────────────────────────┐
│  navbar (cream, hairline beneath)    │
├──────────────────────────────────────┤
│                                      │
│            text-caption              │
│            "MYE030 — Spring 2026"    │
│                                      │
│         ┌────────────────────┐       │
│         │   Data, integrated │       │ ← text-display
│         │   and read like    │       │   Crimson Pro
│         │   a journal.       │       │
│         └────────────────────┘       │
│                                      │
│     text-lede (italic, centred)      │
│                                      │
│        [Enter the dashboard]         │ ← primary button
│                                      │
│                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │ articles │ │ authors  │ │venues│ │ ← 3 KPI tiles
│  │ 2.5M     │ │  1.4M    │ │ 7k   │ │   JetBrains Mono
│  └──────────┘ └──────────┘ └──────┘ │
│                                      │
└──────────────────────────────────────┘
```

- Hero block centred, vertical padding `space-24`.
- KPI tiles row in a `default`-width container, gap `space-6`.
- No footer below the KPIs on this page — the page ends here.

### 11.2 Dashboard

```
┌──────────────────────────────────────┐
│ navbar                               │
├──────────────────────────────────────┤
│ section ▸ At a glance                │
│   row: 4 KPI tiles                   │
│ section ▸ Publications over time     │
│   line chart, default-width          │
│ section ▸ Top venues this decade     │
│   bar chart + filter dropdown        │
│ section ▸ Recent activity            │
│   table of 10 latest articles        │
└──────────────────────────────────────┘
```

### 11.3 Profile page (Conference / Journal / Author / Year)

```
┌──────────────────────────────────────┐
│ navbar + breadcrumb                  │
├──────────────────────────────────────┤
│ text-caption     "JOURNAL · Q1"       │
│ text-h1          TKDE                 │
│ text-lede        IEEE Transactions… │
│                                      │
│ ┌─────────────────────────────────┐  │
│ │ metadata grid: publisher, sjr,  │  │ ← parchment card
│ │ h-index, country, range…        │  │
│ └─────────────────────────────────┘  │
│                                      │
│ section ▸ Yearly statistics          │
│   line chart                         │
│ section ▸ Top authors                │
│   table                              │
│ section ▸ Articles                   │
│   paginated table with filters       │
└──────────────────────────────────────┘
```

### 11.4 List page (Journals / Conferences / Authors / Years)

```
┌──────────────────────────────────────┐
│ navbar                               │
├──────────────────────────────────────┤
│ text-h2 + count badge                │
│ filter bar (search, year, rank…)     │
│ table with sticky header             │
│ pagination footer (showing X–Y of N) │
└──────────────────────────────────────┘
```

### 11.5 Charts playground

Wide container, sidebar of chart configurators on the left
(280 px fixed), chart canvas on the right. Each configurator section
is a Card. Active chart updates as filters change with the 400 ms
axis transition.

---

## 12. Tailwind tokens

`tailwind.config.ts` extends the theme with the project palette,
fonts, and shadow scale. Tokens here are the source of truth — every
component reads them, no hard-coded hex codes.

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F5F1E8",
        parchment: "#E8E2D5",
        linen: "#DCD4C2",
        ink: "#1A1A1A",
        slate: "#3A3A3A",
        smoke: "#8A857A",
        hairline: "#C8C0AE",
        navy: "#14213D",
        ochre: "#A88B4A",
        oxblood: "#6B2737",
        sage: "#4F6F4E",
        sky: "#5B7B8C",
        wheat: "#C9A961",
      },
      fontFamily: {
        serif: ['"Crimson Pro"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["4rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        h1: ["3rem", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        h2: ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        h3: ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.005em" }],
        h4: ["1.375rem", { lineHeight: "1.25" }],
        lede: ["1.25rem", { lineHeight: "1.5" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.02em" }],
        metric: ["2.5rem", { lineHeight: "1.0", letterSpacing: "-0.01em" }],
        "metric-sm": ["1.375rem", { lineHeight: "1.0" }],
      },
      maxWidth: {
        prose: "720px",
        "container-default": "1120px",
        "container-wide": "1360px",
      },
      boxShadow: {
        e1: "0 1px 0 0 #C8C0AE",
        e2: "0 4px 12px rgba(20, 33, 61, 0.06)",
        e3: "0 12px 32px rgba(20, 33, 61, 0.12)",
      },
      borderRadius: {
        xs: "2px",
        sm: "4px",
        md: "6px",
      },
    },
  },
} satisfies Config;
```

Global CSS resets in `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { background-color: theme(colors.cream); }
  body {
    color: theme(colors.ink);
    font-family: theme(fontFamily.sans);
    font-feature-settings: "ss01", "cv11";
  }
  ::selection {
    background-color: theme(colors.ochre / 30%);
    color: theme(colors.ink);
  }
  :focus-visible {
    outline: 2px solid theme(colors.ochre);
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

---

## 13. Accessibility

The system is intentionally low-contrast for warmth, which means
contrast must be measured, not eyeballed.

### 13.1 Contrast ratios (WCAG AA target)

Measured against the page background `#F5F1E8`:

| Foreground | Ratio | AA body | AA large |
|---|---|---|---|
| Ink `#1A1A1A` | 14.0:1 | pass | pass |
| Slate `#3A3A3A` | 9.7:1 | pass | pass |
| Smoke `#8A857A` | 3.2:1 | **fail body** | pass |
| Navy `#14213D` | 13.0:1 | pass | pass |
| Ochre `#A88B4A` | 3.1:1 | **fail body** | pass |
| Oxblood `#6B2737` | 8.5:1 | pass | pass |
| Sage `#4F6F4E` | 5.9:1 | pass | pass |

Smoke and Ochre are large-text-only — they appear in captions, axis
labels, badges, and headings, never in paragraph body copy. Lint this
in code review.

### 13.2 Keyboard

- Every interactive element has a visible `:focus-visible` ring (the
  Ochre outline above).
- Tab order follows DOM order. Do not use `tabindex > 0` to reorder.
- Cmd+K palette traps focus while open and returns it to the trigger
  on close.
- Modal dialogs trap focus and dismiss on `Escape`.

### 13.3 Screen reader

- Every chart is followed by a hidden `<table>` with the same data.
  Visx + a small `VisuallyHidden` wrapper handles this.
- Icon-only buttons use `aria-label`.
- Live regions (`aria-live="polite"`) wrap toast notifications.

### 13.4 Motion preferences

`prefers-reduced-motion: reduce` collapses transitions to 0 ms.

---

## 14. Don'ts

A short list of things this design system explicitly rejects.

- **No pure white.** Backgrounds are Cream. White looks like a Google
  Doc.
- **No pure black.** Body text is Ink `#1A1A1A`, not `#000`.
- **No drop shadows on cards.** Cards are flat with a Hairline border.
- **No gradients.** Including the subtle navy → indigo ones that look
  fine in Figma and terrible at 4K.
- **No glassmorphism.** No `backdrop-filter: blur`. Anywhere.
- **No round-corner radii above 6 px** on rectangular surfaces.
  Buttons, cards, dialogs all stay quietly cornered.
- **No emoji in the UI.** Use Lucide icons. Emoji betray the AI
  origin and read as casual in a serious surface.
- **No skeuomorphism.** This is not a book. It's a digital surface
  that *reads like* a book. No torn-paper edges, no leather spines,
  no faux folio numerals.
- **No bouncy animations.** No spring physics, no rubber-banding, no
  `ease: elastic`. Transitions are functional, not playful.
- **No "AI-style" dashboards.** No giant glowing CTAs, no
  loud accent colour fills, no centred giant numbers floating on
  cards with five-colour gradients.
- **No dark mode.** The cream palette doesn't translate. Defer until
  there's a real ask — YAGNI.
- **No decorative illustrations.** Charts are the illustration.
- **No client-side data aggregation.** All grouping/filtering happens
  server-side; the UI is a reading surface, not a Pandas notebook.
