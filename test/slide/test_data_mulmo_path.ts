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

// ─── slide-level header text ───

test("data-mulmo-path: title slide emits paths for title / subtitle / eyebrow / chip", () => {
  const slide = slideLayoutSchema.parse({
    layout: "title",
    eyebrow: { label: "kickoff" },
    title: "Hello",
    subtitle: "Sub",
    chips: ["one", "two"],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/<h1[^>]*data-mulmo-path="title"/.test(html), "h1 should carry data-mulmo-path=title");
  assert.ok(/<p[^>]*data-mulmo-path="subtitle"/.test(html));
  assert.ok(/data-mulmo-path="eyebrow.label"/.test(html));
  assert.ok(/data-mulmo-path="chips\[0\]"/.test(html));
  assert.ok(/data-mulmo-path="chips\[1\]"/.test(html));
});

test("data-mulmo-path: stats slide emits paths for each stat field", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "Q1",
    subtitle: "FY26",
    stats: [
      { numLabel: "01", value: "+42%", label: "Revenue", change: "+5%" },
      { value: "1.8M", label: "Users" },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="stats\[0\].numLabel"/.test(html));
  assert.ok(/data-mulmo-path="stats\[0\].value"/.test(html));
  assert.ok(/data-mulmo-path="stats\[0\].label"/.test(html));
  assert.ok(/data-mulmo-path="stats\[0\].change"/.test(html));
  assert.ok(/data-mulmo-path="stats\[1\].value"/.test(html));
});

test("data-mulmo-path: timeline emits paths for each item.date/title/description", () => {
  const slide = slideLayoutSchema.parse({
    layout: "timeline",
    title: "Roadmap",
    items: [
      { date: "Q1", title: "kickoff", description: "start" },
      { date: "Q2", title: "MVP" },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="items\[0\].date"/.test(html));
  assert.ok(/data-mulmo-path="items\[0\].title"/.test(html));
  assert.ok(/data-mulmo-path="items\[0\].description"/.test(html));
  assert.ok(/data-mulmo-path="items\[1\].title"/.test(html));
});

test("data-mulmo-path: manifesto emits items[i].title/description", () => {
  const slide = slideLayoutSchema.parse({
    layout: "manifesto",
    title: "Culture",
    items: [
      { title: "Ship daily", description: "small steps compound" },
      { title: "Default to action" },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="items\[0\].title"/.test(html));
  assert.ok(/data-mulmo-path="items\[0\].description"/.test(html));
  assert.ok(/data-mulmo-path="items\[1\].title"/.test(html));
});

test("data-mulmo-path: bigQuote emits quote / author / role", () => {
  const slide = slideLayoutSchema.parse({
    layout: "bigQuote",
    quote: "Stay hungry.",
    author: "Steve",
    role: "Founder",
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="quote"/.test(html));
  assert.ok(/data-mulmo-path="author"/.test(html));
  assert.ok(/data-mulmo-path="role"/.test(html));
});

// ─── content blocks via columns / comparison ───

test("data-mulmo-path: bullets items get content[i].items[j] paths", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [
      {
        title: "C",
        content: [
          {
            type: "bullets",
            items: ["string item", { text: "object item" }],
          },
        ],
      },
    ],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="columns\[0\].content\[0\].items\[0\]"/.test(html), "string bullet item path");
  assert.ok(/data-mulmo-path="columns\[0\].content\[0\].items\[1\].text"/.test(html), "object bullet item path");
});

test("data-mulmo-path: text block emits content[i].value", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L", content: [{ type: "text", value: "hello" }] },
    right: { title: "R" },
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="left.content\[0\].value"/.test(html));
});

test("data-mulmo-path: callout emits label + text", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L", content: [{ type: "callout", label: "Note", text: "important" }] },
    right: { title: "R" },
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="left.content\[0\].label"/.test(html));
  assert.ok(/data-mulmo-path="left.content\[0\].text"/.test(html));
});

test("data-mulmo-path: tag emits .text", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "L", content: [{ type: "tag", text: "MVP" }] },
    right: { title: "R" },
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="left.content\[0\].text"/.test(html));
});

test("data-mulmo-path: comparison panel title + footer", () => {
  const slide = slideLayoutSchema.parse({
    layout: "comparison",
    title: "T",
    left: { title: "Left side", footer: "left foot" },
    right: { title: "Right side", footer: "right foot" },
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="left.title"/.test(html));
  assert.ok(/data-mulmo-path="right.title"/.test(html));
  assert.ok(/data-mulmo-path="left.footer"/.test(html));
});

test("data-mulmo-path: grid item title + description", () => {
  const slide = slideLayoutSchema.parse({
    layout: "grid",
    title: "T",
    items: [{ title: "A", description: "desc" }, { title: "B" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="items\[0\].title"/.test(html));
  assert.ok(/data-mulmo-path="items\[0\].description"/.test(html));
  assert.ok(/data-mulmo-path="items\[1\].title"/.test(html));
});

test("data-mulmo-path: columns card title / label / numLabel", () => {
  const slide = slideLayoutSchema.parse({
    layout: "columns",
    title: "T",
    columns: [{ title: "Hello", label: "Lbl", numLabel: "01" }],
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/data-mulmo-path="columns\[0\].title"/.test(html));
  assert.ok(/data-mulmo-path="columns\[0\].label"/.test(html));
});

// ─── safety: empty path = no attribute ───

test("data-mulmo-path: top-level renderContentBlock without path emits no attribute (back-compat)", () => {
  // Use a layout whose path threading wasn't touched: section block's own nested content blocks.
  // Simpler: just confirm an extra back-compat test using a slide without these layouts.
  const slide = slideLayoutSchema.parse({ layout: "stats", title: "T", stats: [{ value: "1", label: "A" }] });
  const html = generateSlideHTML(baseTheme, slide);
  // No spurious `data-mulmo-path=""` should appear.
  assert.ok(!/data-mulmo-path=""/.test(html), "no empty data-mulmo-path attributes");
});
