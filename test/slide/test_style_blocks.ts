import test from "node:test";
import assert from "node:assert";
import { generateSlideHTML } from "../../src/render.js";
import type { SlideTheme, SlideLayout } from "../../src/schema.js";

const theme: SlideTheme = {
  colors: {
    bg: "0F172A",
    bgCard: "1E293B",
    bgCardAlt: "334155",
    text: "FFFFFF",
    textMuted: "CBD5E1",
    textDim: "64748B",
    primary: "3B82F6",
    accent: "8B5CF6",
    success: "22C55E",
    warning: "F97316",
    danger: "EF4444",
    info: "14B8A6",
    highlight: "EC4899",
  },
  fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
} as unknown as SlideTheme;

const slide: SlideLayout = { layout: "title", title: "T" } as SlideLayout;

/**
 * The optional rule sets, in document order. The first `<style>` is the fixed
 * html/body reset, which is not one of them.
 */
const optionalStyles = (html: string): string[] => (html.match(/<style>[\s\S]*?<\/style>/g) ?? []).slice(1).map((s) => s.slice(7, -8));

const withTheme = (extra: Record<string, unknown>): SlideTheme => ({ ...theme, ...extra }) as unknown as SlideTheme;
const withSlide = (extra: Record<string, unknown>): SlideLayout => ({ ...slide, ...extra }) as unknown as SlideLayout;

// ═══════════════════════════════════════════════════════════
// Exact CSS each optional rule set emits.
// The golden test pins the whole document by hash; these state the contract in a
// form a reader can check, and fail with a readable diff rather than a hash.
// ═══════════════════════════════════════════════════════════

test("titleGradient: emits exactly the background-clip rule", () => {
  const css = optionalStyles(generateSlideHTML(withTheme({ titleGradient: "linear-gradient(90deg,#fff,#000)" }), slide));
  assert.deepStrictEqual(css, [
    "h1.font-title.font-bold{background:linear-gradient(90deg,#fff,#000);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;}",
  ]);
});

test("cardStyle=glass: emits exactly the two card override rules", () => {
  const css = optionalStyles(generateSlideHTML(withTheme({ cardStyle: "glass" }), slide));
  assert.deepStrictEqual(css, [
    ".card-glass .bg-d-card{background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))!important;" +
      "border:1px solid rgba(120,150,220,.22)!important;box-shadow:none!important}" +
      ".card-glass .rounded-lg{border-radius:16px!important}",
  ]);
});

test("density=compact: emits exactly the compact override rules", () => {
  const css = optionalStyles(generateSlideHTML(theme, withSlide({ density: "compact" })));
  assert.deepStrictEqual(css, [
    ".density-compact p,.density-compact li{font-size:14px!important;line-height:1.5}" +
      ".density-compact h2{font-size:32px!important}" +
      ".density-compact h3{font-size:17px!important}" +
      ".density-compact .px-12{padding-left:28px!important;padding-right:28px!important}" +
      ".density-compact .px-16{padding-left:36px!important;padding-right:36px!important}" +
      ".density-compact .pt-5{padding-top:10px!important}" +
      ".density-compact .mt-10{margin-top:16px!important}" +
      ".density-compact .mt-5{margin-top:10px!important}" +
      ".density-compact .gap-4{gap:10px!important}" +
      ".density-compact .gap-6{gap:14px!important}" +
      ".density-compact .space-y-2>*+*{margin-top:4px!important}" +
      ".density-compact .space-y-4>*+*{margin-top:8px!important}" +
      ".density-compact .p-5{padding:14px!important}" +
      ".density-compact .p-10{padding:20px!important}",
  ]);
});

test("intro without stagger: emits keyframes plus one whole-slide rule", () => {
  const css = optionalStyles(generateSlideHTML(theme, withSlide({ intro: "fade" })));
  assert.deepStrictEqual(css, [
    "@keyframes mulmoIntroFade{from{opacity:0}to{opacity:1}} .mulmo-intro{animation:mulmoIntroFade .5s cubic-bezier(.22,.61,.36,1) both}",
  ]);
});

test("intro with stagger: 40 nth-child delays at i * staggerMs, and no whole-slide rule", () => {
  const [css] = optionalStyles(generateSlideHTML(theme, withSlide({ intro: "fade", staggerMs: 120 })));
  assert.ok(css.startsWith("@keyframes mulmoIntroFade{"), "keyframes come first");
  assert.ok(!css.includes(".mulmo-intro{"), "stagger replaces the whole-slide animation rather than compounding with it");

  const delays = [...css.matchAll(/:nth-child\((\d+)\)\{animation-delay:(-?\d+)ms\}/g)].map(([, n, ms]) => [Number(n), Number(ms)]);
  assert.strictEqual(delays.length, 40, "one rule per staggered item, capped at STAGGER_MAX_ITEMS");
  // `:nth-child(n)` is 1-indexed and index i maps to i * staggerMs, so child n waits (n-1) * staggerMs.
  delays.forEach(([n, ms]) => assert.strictEqual(ms, (n - 1) * 120, `child ${n}`));
});

// ═══════════════════════════════════════════════════════════
// Anchoring — which rules could be confined to one slide, and which could not.
// This is the property that decides whether two slides can share a page.
// ═══════════════════════════════════════════════════════════

test("density / cardGlass / intro rules are all anchored to their marker class", () => {
  const anchored: [string, string, SlideTheme, SlideLayout][] = [
    ["density", ".density-compact", theme, withSlide({ density: "compact" })],
    ["cardGlass", ".card-glass", withTheme({ cardStyle: "glass" }), slide],
    ["intro", ".mulmo-intro", theme, withSlide({ intro: "fade" })],
    ["stagger", ".mulmo-stagger", theme, withSlide({ intro: "fade", staggerMs: 120 })],
  ];
  anchored.forEach(([name, marker, t, s]) => {
    const [css] = optionalStyles(generateSlideHTML(t, s));
    // Drop the @keyframes prelude; what remains must be selectors, every one anchored.
    const rules = css.replace(/^@keyframes [^}]*\}[^}]*\}\s*/, "");
    rules
      .split("}")
      .map((r) => r.split("{")[0])
      .filter(Boolean)
      .flatMap((sel) => sel.split(","))
      .forEach((sel) => assert.ok(sel.trim().startsWith(marker), `${name}: selector "${sel}" is not anchored to ${marker}`));
  });
});

test("titleGradient is NOT anchored — it targets h1 globally", () => {
  // Deliberate: with one slide per document there is nothing to collide with.
  // Two slides on one page is a different story, and is what generateSlideFragment
  // has to solve. Pinned so that stops being an accident.
  const [css] = optionalStyles(generateSlideHTML(withTheme({ titleGradient: "linear-gradient(90deg,#fff,#000)" }), slide));
  assert.ok(css.startsWith("h1."), "unscoped h1 selector");
});

test("unsafe gradient values produce no rule set at all", () => {
  const unsafe = "url('http://evil.example/x.png'); } body { display:none } .x{";
  assert.deepStrictEqual(optionalStyles(generateSlideHTML(withTheme({ titleGradient: unsafe }), slide)), []);
});
