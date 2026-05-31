# @mulmocast/deck

Self-contained deck DSL for MulmoCast.

A `SlideLayout` JSON object describes a single semantic slide (e.g. `stats`, `comparison`, `timeline`, `table`, `columns`, …). `generateSlideHTML()` renders it to a single HTML string styled with Tailwind via CDN. No Puppeteer, no filesystem — pure data → HTML. Works in both Node.js and the browser.

## Install

```bash
yarn add @mulmocast/deck
```

## Usage

```ts
import { generateSlideHTML, type SlideLayout, type SlideTheme } from "@mulmocast/deck";

const slide: SlideLayout = {
  layout: "stats",
  title: "Quarterly Highlights",
  subtitle: "FY2026 Q1",
  stats: [
    { value: "+42%", label: "Revenue YoY",       color: "success" },
    { value: "1.8M", label: "Active Users",      color: "primary" },
    { value: "4.6",  label: "Avg NPS",           color: "info" },
    { value: "98%",  label: "Uptime",            color: "accent" },
  ],
};

const theme: SlideTheme = {
  colors: {
    bg: "FFFBEB", bgCard: "FFFFFF", bgCardAlt: "FEF3C7",
    text: "1C1917", textMuted: "57534E", textDim: "A8A29E",
    primary: "EA580C", accent: "D946EF",
    success: "16A34A", warning: "CA8A04", danger: "DC2626",
    info: "0284C7", highlight: "E11D48",
  },
  fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
};

const html = generateSlideHTML(theme, slide);
// → self-contained HTML string. Drop into an iframe srcdoc for live preview,
// or pass to Puppeteer for PNG/PDF rendering (see mulmocast-cli).
```

## Available layouts

`title` · `bigQuote` · `columns` · `comparison` · `stats` · `table` · `timeline` · `matrix` · `grid` · `split` · `funnel` · `waterfall` · `manifesto`

Each layout has its own Zod schema under `slideLayoutSchema` (a discriminated union). See `src/schema.ts` for the full shape.

## Content blocks

`text` · `bullets` · `code` · `callout` · `metric` · `divider` · `image` · `imageRef` · `chart` · `mermaid` · `section` · `table` · `tag`

## Enhancements (0.2 – 0.5)

All fields below are **optional and additive**. Existing decks render byte-identically when they're absent.

### Theme — backgrounds, gradient titles, accent font (0.2.0)

```ts
const theme: SlideTheme = {
  colors: { /* ... */ },
  fonts: {
    title: "'Noto Sans JP', system-ui, sans-serif",
    body:  "'Noto Sans JP', system-ui, sans-serif",
    mono:  "Consolas",
    accent: "Outfit",                                       // optional
  },
  bgGradient: `
    radial-gradient(1200px 700px at 12% -10%, rgba(56,189,248,.16), transparent 60%),
    linear-gradient(160deg, #0A0F24, #16224D)
  `,                                                        // optional
  titleGradient: "linear-gradient(100deg, #FFF, #38BDF8 60%, #818CF8)", // optional
};
```

- `bgGradient` — any CSS background string. Each slide also accepts `style.bgGradient` to override per-slide.
- `titleGradient` — applied as `background-clip: text` to slide `<h1>` / `<h2>` for gradient-filled titles.
- `fonts.accent` — registered as a Tailwind `font-accent` class. Used for tracking-heavy uppercase labels (eyebrow, numLabel, chip stats, etc.).
- `isSafeCssBackground()` is exported — bad values are silently dropped so you can't break out of the CSS context.

### Eyebrow — small uppercase category pill (0.3.0)

Available on every layout that uses the standard slide header (`stats`, `columns`, `comparison`, `grid`, `timeline`, `matrix`, `funnel`, `waterfall`, `manifesto`) plus `title` and `bigQuote`.

```ts
{
  layout: "stats",
  eyebrow: { label: "Highlights" },                   // primary by default
  // or with explicit color
  // eyebrow: { label: "重要", color: "warning" },
  title: "Quarterly Snapshot",
  stats: [/* ... */],
}
```

### Chips row (title layout) — pill badges (0.3.0)

```ts
{
  layout: "title",
  title: "第4回 BootCamp\nキックオフ",
  chips: ["🚀 deploy or die", "🔁 ドッグフーディング", "⚡ 週1アウトプット"],
}
```

### numLabel — accent-colored prefix (0.3.0)

Available on `stats[]` items and `columns[]` cards. Renders as a small accent-colored typographic prefix above (stats) or before (columns) the title — useful for "01 / 02 / 03 …" numbered lists.

```ts
{
  layout: "stats",
  title: "Quarterly Snapshot",
  stats: [
    { numLabel: "01", value: "+42%", label: "Revenue YoY", color: "success" },
    { numLabel: "02", value: "1.8M", label: "Active Users", color: "primary" },
  ],
}
```

```ts
{
  layout: "columns",
  title: "Agenda",
  columns: [
    { numLabel: "01", title: "Origin",  content: [/* ... */] },
    { numLabel: "02", title: "Plan",    content: [/* ... */] },
  ],
}
```

### Icon bullets — status glyphs (0.4.0)

Bullet items now accept `{ icon: "ok" | "no" | "warn" }` to render ✓ / ✕ / ⚠ in the success / danger / warning theme color, replacing the default block marker.

```ts
{
  type: "bullets",
  items: [
    { text: "all green",   icon: "ok"   },   // ✓ in success color
    { text: "broken",      icon: "no"   },   // ✕ in danger color
    { text: "watch out",   icon: "warn" },   // ⚠ in warning color
    "plain string still works (uses block-level marker)",
  ],
}
```

### Hot timeline — "you are here" emphasis (0.4.0)

Add `hot: true` to a `timeline` item to ring its dot. Defaults the color to `warning` when no `color` is set; otherwise it preserves the item's color.

```ts
{
  layout: "timeline",
  title: "Roadmap",
  items: [
    { date: "Q1", title: "Kickoff",    done: true,  color: "success" },
    { date: "Q2", title: "MVP",        done: true,  color: "success" },
    { date: "Q3", title: "Dogfooding", hot: true,   color: "warning" }, // ← ring
    { date: "Q4", title: "Launch" },
  ],
}
```

### Manifesto layout — principles grid (0.4.0)

Grid of small left-bordered cards. Useful for creeds / "what we believe" lists / commitments. Configurable column count (1-4); each line has its own `accentColor` for the left bar.

```ts
{
  layout: "manifesto",
  eyebrow: { label: "Culture" },
  title: "SS の行動哲学",
  columns: 2,                                 // optional, default 2 (1-4)
  items: [
    { title: "行動する、それがすべて。",
      description: "考えているだけでは、存在しないのと同じ。",
      accentColor: "primary" },
    { title: "deploy or die.",
      description: "社会に実装していくことが、すべて。",
      accentColor: "warning" },
    { title: "締切のないタスクは、やらなくていいタスク。",
      accentColor: "success" },
    { title: "失敗していない＝挑戦していない。",
      accentColor: "danger" },
  ],
}
```

### Text size variants — lead / big / sub (0.5.0)

Theme-aware size variants for `text`, `bullets`, and `callout` blocks. Use these instead of hand-picking pixel sizes so the (font + color) tuple stays consistent.

| `size` | px | color | role |
|--|--|--|--|
| `default` (omitted) | 15 | text-muted | body |
| `lead` | 17 | text-muted | intro paragraph |
| `big` | 19 | text-full | emphasized body |
| `sub` | 13 | text-dim | card footnote |

```ts
// Block-level (applies to every item in the list)
{ type: "bullets", size: "lead", items: ["…", "…"] }

// Per-item override (mixes sizes inside one block)
{ type: "bullets", size: "lead", items: [
    "intro size lead",
    { text: "footnote size sub", size: "sub" },
]}

// callout with smaller body text
{ type: "callout", label: "Note", text: "…", size: "sub" }
```

### Inline `*emphasis*` (0.5.0)

In addition to `**bold**` and `{color:text}`, single-asterisk emphasis renders as warning-colored bold (mimics reveal.js amber `<em>`):

```
**bold**     → strong, full text color
*emphasis*   → bold, warning color (amber)
{primary:x}  → primary-colored span
```

`*` is treated as emphasis only at word boundaries — mid-word `a*b*c` (and `* spaced *`) are left as literal asterisks, so existing prose isn't accidentally parsed.

### Slide density — compact (0.5.0)

`density: "compact"` shrinks body / list text and tightens padding for slides with a lot of content. Approximates reveal.js' autofit, no JS required.

```ts
{
  layout: "comparison",
  density: "compact",
  // …content-heavy comparison content here…
}
```

CSS is scoped to `.density-compact` on the slide wrapper so it can't leak.

### Comparison panel `ratio` and `cardless` (0.5.0)

`comparison.left.ratio` / `comparison.right.ratio` (numeric) give asymmetric left/right panels. `cardless: true` drops the card chrome and renders content directly on the slide — useful for the reveal.js `.two` pattern (bare list left, boxed callout right).

```ts
{
  layout: "comparison",
  left: {
    title: "共有する",
    cardless: true,
    ratio: 1.2,
    content: [{ type: "bullets", size: "lead", items: [...] }],
  },
  right: {
    title: "まず動く最小(MVP)",
    content: [
      { type: "tag", text: "MVP", color: "warning" },
      { type: "text", value: "…", size: "sub" },
    ],
  },
}
```

### Grid item `span` (0.5.0)

Asymmetric grids — one wide item spanning multiple columns.

```ts
{
  layout: "grid",
  gridColumns: 3,
  items: [
    { title: "wide hero card", span: 2 },   // takes two columns
    { title: "narrow card" },
    { title: "another", span: 3 },          // spans full row
  ],
}
```

### Title size override — small / default / large / hero (0.5.0)

Per-slide override for the slide title. Applies to layouts that use `slideHeader` / `centeredSlideHeader` (most layouts), and to the `title` layout's h1.

| `titleSize` | h2 (px) | title-layout h1 (px) |
|--|--|--|
| `small` | 34 | 48 |
| `default` (omitted) | 42 | 60 |
| `large` | 52 | 68 |
| `hero` | 64 | 76 |

```ts
{ layout: "title", titleSize: "hero", title: "OPENING" }
{ layout: "comparison", titleSize: "small", density: "compact", title: "ルールと注意点", … }
```

### Subtitle size — default / lead / big (0.5.0)

```ts
{
  layout: "stats",
  title: "Q1 Snapshot",
  subtitle: "売上は前年同期比 +42%",
  subtitleSize: "big",  // 22px — matches reveal.js .big.muted
}
```

### Glass card style (0.5.0)

`theme.cardStyle: "glass"` swaps the default opaque `bg-d-card` for a subtle white-gradient + 1px translucent border + 16px radius. Off by default — when set, every card on every slide gets the treatment.

```ts
const theme: SlideTheme = {
  colors: { … },
  fonts: { … },
  cardStyle: "glass",
};
```

### `tag` content block (0.5.0)

Small uppercase accent label intended for use INSIDE cards. Distinct from the slide-level `eyebrow` (which sits at the top of the whole slide).

```ts
{
  layout: "comparison",
  right: {
    title: "価値が伝わる最小のものを",
    content: [
      { type: "tag", text: "まず動く最小 (MVP)", color: "warning" },
      { type: "text", value: "CLI / HTML1枚 / LP / モック でいい。", size: "sub" },
    ],
  },
}
```

## Design

- **Data → HTML, no side effects.** Pure functions, easy to test and use anywhere.
- **Tailwind via CDN.** Themes resolve to CSS variables; no compile step.
- **Schema-first.** All shapes are validated with [Zod](https://zod.dev), so types are derived (not duplicated).
- **Browser-safe.** No Node-only APIs. Just import in a Vite/Vue/React app and render into an iframe.
- **Additive evolution.** New optional fields never break existing decks — guaranteed by the test suite.

## Consumers

- [`mulmocast`](https://www.npmjs.com/package/mulmocast) — CLI uses `generateSlideHTML()` then snapshots to PNG with Puppeteer.
- `@mulmocast/deck-web` *(WIP)* — Browser editor with live preview and schema-driven inspector.

## License

MIT
