import test from "node:test";
import assert from "node:assert";

import { generateSlideHTML, slideLayoutSchema, type SlideTheme } from "../../src/index.js";

const baseTheme: SlideTheme = {
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

// ─── back-compat: existing minimal slides still parse and render unchanged shape ───

test("schema: title slide parses without phase-2 fields (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "title", title: "Hello" });
  assert.equal(slide.eyebrow, undefined);
  assert.equal(slide.chips, undefined);
});

test("schema: stats item parses without numLabel (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "S",
    stats: [{ value: "1", label: "A" }],
  });
  if (slide.layout !== "stats") throw new Error("type guard");
  assert.equal(slide.stats[0].numLabel, undefined);
});

test("schema: card in columns parses without numLabel (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "C",
    columns: [{ title: "A" }],
  });
  if (slide.layout !== "columns") throw new Error("type guard");
  assert.equal(slide.columns[0].numLabel, undefined);
});

// ─── eyebrow (shared across all layouts that use slideHeader / centeredSlideHeader) ───

test("eyebrow renders on a stats slide as an uppercase pill", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    eyebrow: { label: "Highlights" },
    title: "Q1 Snapshot",
    stats: [{ value: "1", label: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/uppercase/.test(html), "eyebrow should be uppercase-styled");
  assert.ok(html.includes("Highlights"), "eyebrow label should appear in output");
  assert.ok(/rounded-full/.test(html), "eyebrow should be a rounded pill");
});

test("eyebrow color override (warning) applies to text color class", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    eyebrow: { label: "重要", color: "warning" },
    title: "T",
    stats: [{ value: "1", label: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-d-warning/.test(html), "eyebrow color override should generate text-d-warning class");
});

test("eyebrow renders on a title slide (custom layout, not slideHeader)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "title",
    eyebrow: { label: "Kickoff" },
    title: "Hello",
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("Kickoff"));
  assert.ok(/uppercase/.test(html));
});

test("eyebrow renders on a bigQuote slide", () => {
  const slide = slideLayoutSchema.parse({
    layout: "bigQuote",
    eyebrow: { label: "Let's go" },
    quote: "Stay hungry.",
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("Let's go") || html.includes("Let&#39;s go"));
});

test("slide without eyebrow does NOT emit eyebrow markup (back-compat / byte budget)", () => {
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  const html = generateSlideHTML(baseTheme, slide);
  // The 'uppercase tracking-[0.16em]' combo is unique to the eyebrow pill; should be absent
  assert.ok(!html.includes("uppercase tracking-[0.16em]"), "no eyebrow markup should appear when not set");
});

// ─── chips row (title only) ───

test("title.chips renders a row of bordered pill badges", () => {
  const slide = slideLayoutSchema.parse({
    layout: "title",
    title: "Hello",
    chips: ["🚀 ship it", "⚡ fast"],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("🚀 ship it"));
  assert.ok(html.includes("⚡ fast"));
  assert.ok(/flex gap-2 flex-wrap/.test(html), "chips container should be a flex row");
});

test("title without chips does NOT emit the chips container (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "title", title: "Hello" });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!/flex gap-2 flex-wrap/.test(html), "no chips container when chips is absent");
});

// ─── numLabel: stats + columns ───

test("stats: numLabel renders as accent-colored prefix above the value", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "T",
    stats: [
      { numLabel: "01", value: "+42%", label: "YoY", color: "success" },
      { numLabel: "02", value: "1.8M", label: "Users", color: "primary" },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes(">01<"), "first stat's numLabel should appear");
  assert.ok(html.includes(">02<"), "second stat's numLabel should appear");
  assert.ok(/font-accent/.test(html), "numLabel should use font-accent");
});

test("columns: numLabel renders as accent-colored prefix before the card title", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "Agenda",
    columns: [
      { numLabel: "01", title: "Origin" },
      { numLabel: "02", title: "Plan" },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/>01<\/span>.*Origin/.test(html.replace(/\n/g, " ")), "numLabel should prefix the card title");
});

test("stats without numLabel does NOT emit the prefix element (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  const html = generateSlideHTML(baseTheme, slide);
  // No font-accent + tracking-wider combo for that prefix
  assert.ok(!/font-accent font-extrabold[^"]*tracking-wider/.test(html), "no numLabel prefix when not set");
});
