import test from "node:test";
import assert from "node:assert";

import { generateSlideHTML, slideLayoutSchema, type SlideTheme } from "../../src/index.js";

const baseTheme: SlideTheme = {
  colors: {
    bg: "0B0F1A",
    bgCard: "111827",
    bgCardAlt: "1F2937",
    text: "F3F4F6",
    textMuted: "9CA3AF",
    textDim: "6B7280",
    primary: "3B82F6",
    accent: "A855F7",
    success: "10B981",
    warning: "F59E0B",
    danger: "EF4444",
    info: "06B6D4",
    highlight: "EC4899",
  },
  fonts: { title: "Georgia", body: "Inter", mono: "JetBrains Mono" },
};

const glassTheme: SlideTheme = { ...baseTheme, cardStyle: "glass" };

// ─── back-compat ───

test("schema: theme without cardStyle parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!html.includes("card-glass"), "no card-glass class when theme.cardStyle is absent");
});

test("schema: slide without subtitleSize parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "T",
    subtitle: "sub",
    stats: [{ value: "1", label: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[15px\]/.test(html), "subtitle defaults to 15px");
});

// ─── glass card style ───

test("theme.cardStyle=glass: emits card-glass class and CSS overrides", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L", content: [{ type: "text", value: "x" }] },
    right: { title: "R", content: [{ type: "text", value: "y" }] },
  });
  const html = generateSlideHTML(glassTheme, slide);
  assert.ok(html.includes("card-glass"), "wrapper should carry the card-glass class");
  assert.ok(/linear-gradient\(180deg,rgba\(255,255,255,\.05\)/.test(html), "glass gradient bg should be injected");
  assert.ok(/border:1px solid rgba\(120,150,220,\.22\)/.test(html), "glass border should be injected");
});

test("theme.cardStyle=solid (or absent): no glass CSS is emitted", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L" },
    right: { title: "R" },
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!html.includes("card-glass"));
  assert.ok(!html.includes("linear-gradient(180deg,rgba"));
});

// ─── tag content block ───

test("tag block: renders as uppercase accent label", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [
      {
        title: "C",
        content: [
          { type: "tag", text: "MVP" },
          { type: "text", value: "details" },
        ],
      },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/uppercase[^"]*tracking-\[0\.12em\]/.test(html), "tag should be uppercase + tracking-[0.12em]");
  assert.ok(html.includes(">MVP<"), "tag text preserved");
});

test("tag block: color override applies", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [
      {
        title: "C",
        content: [{ type: "tag", text: "WARN", color: "warning" }],
      },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-d-warning[^"]*font-accent/.test(html), "tag with color=warning should produce text-d-warning");
});

// ─── subtitleSize ───

test("subtitleSize=big: subtitle uses 22px", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "T",
    subtitle: "big subtitle",
    subtitleSize: "big",
    stats: [{ value: "1", label: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[22px\][^"]*text-d-dim/.test(html), "subtitleSize=big should produce 22px subtitle");
});

test("subtitleSize=lead: subtitle uses 17px", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "T",
    subtitle: "lead subtitle",
    subtitleSize: "lead",
    stats: [{ value: "1", label: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[17px\][^"]*text-d-dim/.test(html));
});

// ─── title h1 retune ───

test("title layout: hero titleSize uses 76px (retuned from 88)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "title",
    titleSize: "hero",
    title: "Big",
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[76px\][^"]*font-title/.test(html), "title h1 hero should be 76px");
});

test("title layout default still 60px (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "title", title: "Plain" });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[60px\][^"]*font-title/.test(html));
});
