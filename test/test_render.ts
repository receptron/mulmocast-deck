import test from "node:test";
import assert from "node:assert";

import { generateSlideHTML, slideLayoutSchema, slideThemeSchema, type SlideTheme } from "../src/index.js";

const theme: SlideTheme = {
  colors: {
    bg: "FFFBEB",
    bgCard: "FFFFFF",
    bgCardAlt: "FEF3C7",
    text: "1C1917",
    textMuted: "57534E",
    textDim: "A8A29E",
    primary: "EA580C",
    accent: "D946EF",
    success: "16A34A",
    warning: "CA8A04",
    danger: "DC2626",
    info: "0284C7",
    highlight: "E11D48",
  },
  fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
};

test("schema parses a valid stats slide", () => {
  const parsed = slideLayoutSchema.parse({
    layout: "stats",
    title: "Q1",
    stats: [
      { value: "+42%", label: "Revenue", color: "success" },
      { value: "1.8M", label: "Users", color: "primary" },
    ],
  });
  assert.equal(parsed.layout, "stats");
});

test("theme schema parses the canonical theme", () => {
  const t = slideThemeSchema.parse(theme);
  assert.equal(t.colors.primary, "EA580C");
});

test("generateSlideHTML renders a title slide to a Tailwind HTML string", () => {
  const slide = slideLayoutSchema.parse({
    layout: "title",
    title: "Hello",
    subtitle: "World",
  });
  const html = generateSlideHTML(theme, slide);
  assert.equal(typeof html, "string");
  assert.ok(html.length > 100, "rendered HTML should be non-trivial");
  assert.ok(html.includes("Hello"), "title should appear in output");
  assert.ok(html.includes("tailwindcss") || html.includes("cdn"), "Tailwind CDN should be referenced");
});

test("generateSlideHTML renders all built-in layouts without throwing", () => {
  const samples: Array<Record<string, unknown>> = [
    { layout: "title", title: "T", subtitle: "S" },
    { layout: "bigQuote", quote: "Stay hungry, stay foolish.", author: "Steve Jobs" },
    {
      layout: "stats",
      title: "KPIs",
      stats: [
        { value: "1", label: "A" },
        { value: "2", label: "B" },
      ],
    },
    {
      layout: "columns",
      title: "Two columns",
      columns: [
        { title: "Left", content: [{ type: "bullets", items: ["a", "b"] }] },
        { title: "Right", content: [{ type: "bullets", items: ["c", "d"] }] },
      ],
    },
    {
      layout: "comparison",
      title: "Before vs After",
      left: { title: "Before", accentColor: "danger", content: [{ type: "bullets", items: ["slow"] }] },
      right: { title: "After", accentColor: "success", content: [{ type: "bullets", items: ["fast"] }] },
    },
    {
      layout: "table",
      title: "T",
      headers: ["A", "B"],
      rows: [
        ["1", "2"],
        ["3", "4"],
      ],
    },
  ];
  for (const raw of samples) {
    const slide = slideLayoutSchema.parse(raw);
    const html = generateSlideHTML(theme, slide);
    assert.ok(html.length > 100, `layout ${raw.layout} should render non-trivial HTML`);
  }
});
