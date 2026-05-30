# @mulmocast/slide

Self-contained slide DSL for MulmoCast.

A `SlideLayout` JSON object describes a semantic slide (e.g. `stats`, `comparison`, `timeline`, `table`, `columns`, …). `generateSlideHTML()` renders it to a single HTML string styled with Tailwind via CDN. No Puppeteer, no filesystem — pure data → HTML. Works in both Node.js and the browser.

## Install

```bash
yarn add @mulmocast/slide
```

## Usage

```ts
import { generateSlideHTML, type SlideLayout, type SlideTheme } from "@mulmocast/slide";

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

`title` · `bigQuote` · `columns` · `comparison` · `stats` · `table` · `timeline` · `matrix` · `grid` · `split` · `funnel` · `waterfall`

Each layout has its own Zod schema under `slideLayoutSchema` (a discriminated union). See `src/schema.ts` for the full shape.

## Design

- **Data → HTML, no side effects.** Pure functions, easy to test and use anywhere.
- **Tailwind via CDN.** Themes resolve to CSS variables; no compile step.
- **Schema-first.** All shapes are validated with [Zod](https://zod.dev), so types are derived (not duplicated).
- **Browser-safe.** No Node-only APIs. Just import in a Vite/Vue/React app and render into an iframe.

## Consumers

- [`mulmocast`](https://www.npmjs.com/package/mulmocast) — CLI uses `generateSlideHTML()` then snapshots to PNG with Puppeteer.
- `@mulmocast/slide-web` *(WIP)* — Browser editor with live preview and schema-driven inspector.

## License

AGPL-3.0-only
