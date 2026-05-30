import test from "node:test";
import assert from "node:assert";

import { generateSlideHTML, slideLayoutSchema, slideThemeSchema, type SlideTheme } from "../../src/index.js";
import { isSafeCssBackground } from "../../src/utils.js";

const baseColors = {
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
} as const;

const titleSlide = slideLayoutSchema.parse({ layout: "title", title: "Hello" });

test("isSafeCssBackground accepts standard gradients and colors", () => {
  assert.ok(isSafeCssBackground("linear-gradient(160deg, #0a0f24, #16224d)"));
  assert.ok(isSafeCssBackground("radial-gradient(1200px 700px at 12% -10%, rgba(56,189,248,.16), transparent 60%)"));
  assert.ok(isSafeCssBackground("#0a0f24"));
});

test("isSafeCssBackground rejects context-breaking and dangerous tokens", () => {
  assert.equal(isSafeCssBackground(""), false);
  assert.equal(isSafeCssBackground('red"; background: blue'), false); // attr breakout
  assert.equal(isSafeCssBackground("red; color: blue"), false); // multi-decl injection
  assert.equal(isSafeCssBackground("url(javascript:alert(1))"), false);
  assert.equal(isSafeCssBackground("url(http://evil.example/x.png)"), false);
  assert.equal(isSafeCssBackground("expression(alert(1))"), false);
  assert.equal(isSafeCssBackground("a".repeat(2001)), false); // length cap
  assert.equal(isSafeCssBackground("red\n}body{display:none"), false); // newline + CSS injection
});

test("slideThemeSchema accepts new optional fields (bgGradient / titleGradient / fonts.accent)", () => {
  const theme = slideThemeSchema.parse({
    colors: baseColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas", accent: "Outfit" },
    bgGradient: "linear-gradient(160deg, #0a0f24, #16224d)",
    titleGradient: "linear-gradient(100deg, #fff, #38bdf8 60%, #818cf8)",
  });
  assert.equal(theme.fonts.accent, "Outfit");
  assert.equal(theme.bgGradient, "linear-gradient(160deg, #0a0f24, #16224d)");
  assert.ok(theme.titleGradient);
});

test("slideThemeSchema is backward-compatible: minimal theme parses unchanged", () => {
  const theme = slideThemeSchema.parse({
    colors: baseColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
  });
  assert.equal(theme.fonts.accent, undefined);
  assert.equal(theme.bgGradient, undefined);
  assert.equal(theme.titleGradient, undefined);
});

test("generateSlideHTML emits inline background style when theme.bgGradient is set", () => {
  const theme: SlideTheme = {
    colors: baseColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
    bgGradient: "linear-gradient(160deg, #0a0f24, #16224d)",
  };
  const html = generateSlideHTML(theme, titleSlide);
  assert.ok(html.includes('style="background:linear-gradient(160deg, #0a0f24, #16224d)"'), "bgGradient should appear as inline style");
  assert.ok(!html.includes("bg-d-bg"), "default bg-d-bg class should be suppressed when gradient is in effect");
});

test("generateSlideHTML injects <style> block for theme.titleGradient with background-clip:text", () => {
  const theme: SlideTheme = {
    colors: baseColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
    titleGradient: "linear-gradient(100deg, #fff, #38bdf8)",
  };
  const html = generateSlideHTML(theme, titleSlide);
  assert.ok(html.includes("h1.font-title.font-bold{background:linear-gradient(100deg, #fff, #38bdf8)"), "titleGradient css block should appear");
  assert.ok(html.includes("-webkit-background-clip:text"), "background-clip:text should be present");
});

test("generateSlideHTML registers font-accent in tailwind config when theme.fonts.accent is set", () => {
  const theme: SlideTheme = {
    colors: baseColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas", accent: "Outfit" },
  };
  const html = generateSlideHTML(theme, titleSlide);
  assert.ok(/"accent":\["Outfit"/.test(html), "fontFamily.accent should be emitted in tailwind config when set");
});

test("generateSlideHTML silently ignores unsafe gradient values", () => {
  const theme: SlideTheme = {
    colors: baseColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
    bgGradient: 'red"; background: blue',
  };
  const html = generateSlideHTML(theme, titleSlide);
  assert.ok(!html.includes('red"; background: blue'), "unsafe value must not be injected");
  assert.ok(html.includes("bg-d-bg"), "should fall back to default bg class when gradient is unsafe");
});

test("per-slide style.bgGradient wins over theme.bgGradient", () => {
  const theme: SlideTheme = {
    colors: baseColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
    bgGradient: "linear-gradient(0deg, #111, #222)",
  };
  const slide = slideLayoutSchema.parse({
    layout: "title",
    title: "Hi",
    style: { bgGradient: "radial-gradient(circle, #ff0, #f00)" },
  });
  const html = generateSlideHTML(theme, slide);
  assert.ok(html.includes("radial-gradient(circle, #ff0, #f00)"));
  assert.ok(!html.includes("linear-gradient(0deg, #111, #222)"));
});
