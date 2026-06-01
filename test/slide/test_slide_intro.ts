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

test("schema: slide without intro parses (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "title", title: "T" });
  assert.equal(slide.intro, undefined);
  assert.equal(slide.staggerMs, undefined);
});

test("no intro → no animation CSS emitted (back-compat)", () => {
  const slide = slideLayoutSchema.parse({ layout: "title", title: "T" });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!/mulmoIntro/.test(html), "no keyframes when intro is absent");
  assert.ok(!/mulmo-intro|mulmo-stagger/.test(html), "no animation class on root");
});

// ─── whole-slide intro ───

test("intro=fade emits keyframes + .mulmo-intro on root", () => {
  const slide = slideLayoutSchema.parse({ layout: "title", title: "T", intro: "fade" });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/@keyframes mulmoIntroFade/.test(html));
  assert.ok(/class="[^"]*\bmulmo-intro\b/.test(html), "root carries mulmo-intro class");
  assert.ok(/\.mulmo-intro\{animation:mulmoIntroFade/.test(html));
});

test("intro=fade-up emits a translateY keyframe", () => {
  const slide = slideLayoutSchema.parse({ layout: "title", title: "T", intro: "fade-up" });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/@keyframes mulmoIntroFadeUp\{from\{opacity:0;transform:translateY\(20px\)\}/.test(html));
});

test("intro=zoom-in emits a scale keyframe", () => {
  const slide = slideLayoutSchema.parse({ layout: "title", title: "T", intro: "zoom-in" });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/transform:scale\(\.92\)/.test(html));
});

// ─── staggered items ───

test("intro + staggerMs adds .mulmo-stagger and nth-child delays, no whole-slide animation", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "Q1",
    stats: [
      { value: "1", label: "A" },
      { value: "2", label: "B" },
      { value: "3", label: "C" },
    ],
    intro: "fade-up",
    staggerMs: 80,
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/class="[^"]*\bmulmo-stagger\b/.test(html), "root carries mulmo-stagger class");
  assert.ok(!/class="[^"]*\bmulmo-intro\b/.test(html), "root does NOT carry mulmo-intro when staggering");
  assert.ok(/\.mulmo-stagger \[data-mulmo-item-path\]\{animation:mulmoIntroFadeUp/.test(html));
  assert.ok(/:nth-child\(1\)\{animation-delay:0ms\}/.test(html), "first item has 0ms delay");
  assert.ok(/:nth-child\(2\)\{animation-delay:80ms\}/.test(html), "second item has 80ms delay");
  assert.ok(/:nth-child\(3\)\{animation-delay:160ms\}/.test(html), "third item has 160ms delay");
});

test("staggerMs without intro is a no-op (intro is required)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "T",
    stats: [{ value: "1", label: "A" }],
    staggerMs: 100,
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(!/mulmoIntro/.test(html));
  assert.ok(!/mulmo-intro|mulmo-stagger/.test(html));
});

test("staggerMs=0 falls back to whole-slide intro (no stagger)", () => {
  const slide = slideLayoutSchema.parse({
    layout: "stats",
    title: "T",
    stats: [{ value: "1", label: "A" }],
    intro: "fade",
    staggerMs: 0,
  });
  const html = generateSlideHTML(baseTheme, slide);
  assert.ok(/class="[^"]*\bmulmo-intro\b/.test(html), "0ms stagger = no stagger, use mulmo-intro");
  assert.ok(!/mulmo-stagger/.test(html));
});
