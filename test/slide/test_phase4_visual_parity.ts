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

test("schema: text block without size still parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "text", value: "hello" }] }],
  });
  if (slide.layout !== "columns") throw new Error("type guard");
  const block = slide.columns[0].content?.[0];
  assert.equal(block?.type, "text");
});

test("schema: comparison panel without ratio still parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L" },
    right: { title: "R" },
  });
  if (slide.layout !== "comparison") throw new Error("type guard");
  assert.equal(slide.left.ratio, undefined);
});

test("schema: slide without density still parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  assert.equal(slide.density, undefined);
});

test("back-compat: minimal slide HTML is unchanged when no Phase 4 fields are set", () => {
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!html.includes("density-compact"), "no density class without density field");
  assert.ok(!/<em /.test(html), "no <em> markup unless *emphasis* is used");
});

// ─── text size variants ───

test("text size=lead: text block uses 17px and remains muted", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "text", value: "intro paragraph", size: "lead" }] }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[17px\]/.test(html), "lead should use 17px");
});

test("text size=big: text block uses 19px and full text color", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "text", value: "headline body", size: "big" }] }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[19px\]/.test(html), "big should use 19px");
  assert.ok(/text-d-text/.test(html), "big should use full text color");
});

test("text size=sub: text block uses 13px and dim color", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "text", value: "card footnote", size: "sub" }] }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[13px\]/.test(html), "sub should use 13px");
  assert.ok(/text-d-dim/.test(html), "sub should use dim color");
});

test("legacy numeric fontSize still wins over size variant", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "text", value: "x", fontSize: 24, size: "sub" }] }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-xl/.test(html), "fontSize>=18 should still produce text-xl");
});

// ─── bullets size ───

test("bullets size=big: list uses 19px text", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [
      {
        title: "A",
        content: [{ type: "bullets", size: "big", items: ["a", "b"] }],
      },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[19px\]/.test(html), "block-level size=big should apply to bullets");
});

test("bullets: per-item size overrides block-level size", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [
      {
        title: "A",
        content: [
          {
            type: "bullets",
            size: "big",
            items: ["plain (uses big)", { text: "footnote", size: "sub" }],
          },
        ],
      },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[13px\]/.test(html), "per-item size=sub should appear");
  assert.ok(/text-\[19px\]/.test(html), "block-level size=big still appears for items without their own size");
});

// ─── callout size ───

test("callout size=lead: uses 17px body text", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [
      {
        title: "A",
        content: [{ type: "callout", label: "Note", text: "important", size: "lead" }],
      },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/text-\[17px\]/.test(html), "callout with size=lead should be 17px");
});

// ─── inline *emphasis* ───

test("*emphasis* renders as warning-colored <em>", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "text", value: "this is *important* text" }] }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("<em "), "<em> tag should appear");
  assert.ok(/text-d-warning/.test(html), "emphasis should be warning-colored");
  assert.ok(html.includes(">important</em>"), "emphasis content preserved");
});

test("**bold** still renders before *emphasis* (no conflict)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "text", value: "make **bold** plus *emph* both work" }] }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("<strong>bold</strong>"));
  assert.ok(/<em [^>]+>emph<\/em>/.test(html));
});

test("mid-word asterisks are NOT treated as emphasis (a*b*c)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "A", content: [{ type: "text", value: "var x = a*b*c;" }] }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!html.includes("<em "), "mid-word asterisks should not produce <em>");
});

// ─── density: compact ───

test("density=compact: emits .density-compact class and CSS overrides", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    density: "compact",
    title: "T",
    stats: [{ value: "1", label: "A" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(html.includes("density-compact"), "wrapper should carry the density-compact class");
  assert.ok(/font-size:13px!important/.test(html), "compact CSS body size override should be injected");
});

test("density=default omits the density override CSS entirely", () => {
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!html.includes("density-compact"));
  assert.ok(!/font-size:13px!important/.test(html));
});

// ─── comparison ratio ───

test("comparison ratio: panel emits inline flex-grow when set", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L", ratio: 1.5 },
    right: { title: "R" },
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/flex-grow:1\.5/.test(html), "ratio should produce flex-grow inline style");
});

test("comparison without ratio renders as 50/50 (back-compat)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L" },
    right: { title: "R" },
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!/flex-grow:/.test(html), "no flex-grow style when ratio absent");
  assert.ok(/flex-1/.test(html), "both panels should still use flex-1");
});
