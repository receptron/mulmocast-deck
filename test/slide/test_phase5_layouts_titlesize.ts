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

// ─── back-compat ───

test("schema: comparison panel without cardless still parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L" },
    right: { title: "R" },
  });
  if (slide.layout !== "comparison") throw new Error("type guard");
  assert.equal(slide.left.cardless, undefined);
});

test("schema: grid item without span still parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "grid",
    title: "T",
    items: [{ title: "A" }],
  });
  if (slide.layout !== "grid") throw new Error("type guard");
  assert.equal(slide.items[0].span, undefined);
});

test("schema: slide without titleSize still parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  assert.equal(slide.titleSize, undefined);
});

// ─── cardless comparison ───

test("cardless: panel renders without bg-d-card / shadow / accent bar", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L", cardless: true, content: [{ type: "bullets", items: ["a", "b"] }] },
    right: { title: "R", content: [{ type: "bullets", items: ["c", "d"] }] },
  });
  const html = generateSlideHTML(baseTheme, slide);
  // Right panel keeps the card chrome; left does not — so bg-d-card / shadow-lg should appear only once.
  const cardMatches = html.match(/bg-d-card rounded-lg shadow-lg/g) ?? [];
  assert.equal(cardMatches.length, 1, "exactly one card wrapper should appear (the right panel)");
});

test("cardless: title text still rendered (h3 element preserved)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "Bare list", cardless: true, content: [{ type: "text", value: "x" }] },
    right: { title: "Boxed" },
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("Bare list"), "cardless panel still shows its title");
  assert.ok(html.includes("Boxed"));
});

// ─── grid span ───

test("grid span: item with span=2 gets col-span-2 class", () => {
  const slide = slideLayoutSchema.parse({
    layout: "grid",
    title: "T",
    items: [{ title: "wide", span: 2 }, { title: "narrow" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/col-span-2/.test(html), "span=2 should produce col-span-2");
});

test("grid span: items without span don't emit span classes (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "grid", title: "T", items: [{ title: "A" }, { title: "B" }] });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!/col-span-/.test(html), "no col-span class when span is absent");
});

// ─── titleSize ───

test("titleSize=small: h2 uses 34px", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    titleSize: "small",
    title: "Snapshot",
    stats: [{ value: "1", label: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[34px\][^"]*font-title/.test(html), "h2 should use 34px when titleSize=small");
});

test("titleSize=hero: h2 uses 64px", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    titleSize: "hero",
    title: "Big",
    stats: [{ value: "1", label: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[64px\][^"]*font-title/.test(html), "h2 should use 64px when titleSize=hero");
});

test("titleSize default (omitted): h2 stays at 42px (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[42px\][^"]*font-title/.test(html), "h2 default should be 42px");
});

test("titleSize=large applied through centeredSlideHeader (stats/timeline path)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "timeline",
    titleSize: "large",
    title: "Roadmap",
    items: [{ date: "Q1", title: "Kickoff" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[52px\][^"]*font-title/.test(html), "titleSize=large should produce 52px h2");
});
