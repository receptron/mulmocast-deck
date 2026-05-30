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

test("schema: bullets accept legacy plain strings (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "bullets", items: ["a", "b"] }] }],
  });
  if (slide.layout !== "columns") throw new Error("type guard");
  const block = slide.columns[0].content?.[0];
  assert.equal(block?.type, "bullets");
});

test("schema: timeline item parses without 'hot' (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "timeline",
    title: "T",
    items: [{ date: "Q1", title: "kickoff" }],
  });
  if (slide.layout !== "timeline") throw new Error("type guard");
  assert.equal(slide.items[0].hot, undefined);
});

test("schema: manifestoSlideSchema parses minimal input", () => {
  const slide = slideLayoutSchema.parse({
    layout: "manifesto",
    title: "Our principles",
    items: [{ title: "Ship daily" }, { title: "Default to action" }],
  });
  if (slide.layout !== "manifesto") throw new Error("type guard");
  assert.equal(slide.items.length, 2);
  assert.equal(slide.columns, undefined);
});

// ─── icon bullets ───

test("bullets with icon=ok render a ✓ glyph in success color", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [
      {
        title: "Checks",
        content: [
          {
            type: "bullets",
            items: [
              { text: "all green", icon: "ok" },
              { text: "broken", icon: "no" },
              { text: "watch out", icon: "warn" },
            ],
          },
        ],
      },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("✓"), "✓ glyph should appear for icon=ok");
  assert.ok(html.includes("✕"), "✕ glyph should appear for icon=no");
  assert.ok(html.includes("⚠"), "⚠ glyph should appear for icon=warn");
  assert.ok(/text-d-success/.test(html), "ok icon should be success-colored");
  assert.ok(/text-d-danger/.test(html), "no icon should be danger-colored");
  assert.ok(/text-d-warning/.test(html), "warn icon should be warning-colored");
});

test("bullets without per-item icon still use the block-level marker (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "C", content: [{ type: "bullets", items: ["a", "b"], icon: "▶" }] }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("▶"), "block-level marker should still render");
  assert.ok(!html.includes("✓"));
  assert.ok(!html.includes("✕"));
});

// ─── hot timeline ───

test("timeline: hot=true item gets a ring around its dot", () => {
  const slide = slideLayoutSchema.parse({
    layout: "timeline",
    title: "T",
    items: [
      { date: "Q1", title: "done", done: true, color: "success" },
      { date: "Q2", title: "now", hot: true },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/ring-2 ring-d-warning/.test(html), "hot item should add a warning-colored ring (default hot color)");
});

test("timeline: hot=true preserves an explicit color when set", () => {
  const slide = slideLayoutSchema.parse({
    layout: "timeline",
    title: "T",
    items: [{ date: "Q1", title: "now", hot: true, color: "danger" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/ring-2 ring-d-danger/.test(html), "hot item should respect explicit color");
});

test("timeline: items without hot do NOT emit ring classes (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "timeline",
    title: "T",
    items: [{ date: "Q1", title: "done" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!/ring-2 ring-/.test(html), "no ring when hot is absent");
});

// ─── manifesto layout ───

test("manifesto: renders one card per item, with left-accent bar", () => {
  const slide = slideLayoutSchema.parse({
    layout: "manifesto",
    title: "We believe",
    items: [
      { title: "Ship daily", description: "Small steps compound.", accentColor: "success" },
      { title: "Default to action", accentColor: "warning" },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("Ship daily"));
  assert.ok(html.includes("Default to action"));
  assert.ok(html.includes("Small steps compound."));
  assert.ok(/bg-d-success/.test(html), "success accent bar should appear");
  assert.ok(/bg-d-warning/.test(html), "warning accent bar should appear");
});

test("manifesto: columns=3 yields grid-cols-3", () => {
  const slide = slideLayoutSchema.parse({
    layout: "manifesto",
    title: "T",
    columns: 3,
    items: [{ title: "A" }, { title: "B" }, { title: "C" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/grid-cols-3/.test(html));
});

test("manifesto: default columns is 2 (grid-cols-2)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "manifesto",
    title: "T",
    items: [{ title: "A" }, { title: "B" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/grid-cols-2/.test(html));
});

test("manifesto: items without accentColor fall back to slide accent", () => {
  const slide = slideLayoutSchema.parse({
    layout: "manifesto",
    accentColor: "info",
    title: "T",
    items: [{ title: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/bg-d-info/.test(html), "should use slide-level accentColor for the left bar");
});
