import test from "node:test";
import assert from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateSlideFragment } from "../../src/fragment.js";
import { generateSlideHTML } from "../../src/render.js";
import { slideUtilityCss, buildThemeVars } from "../../src/theme_css.js";
import { resetSlideIdCounter } from "../../src/utils.js";
import type { SlideTheme, SlideLayout } from "../../src/schema.js";

const lightTheme: SlideTheme = {
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
} as unknown as SlideTheme;

const darkTheme = { ...lightTheme, colors: { ...lightTheme.colors, bg: "0F172A" } } as unknown as SlideTheme;
const slide: SlideLayout = { layout: "title", title: "T" } as SlideLayout;
const chartSlide = {
  layout: "columns",
  title: "C",
  columns: [{ title: "A", content: [{ type: "chart", title: "S", chartData: { type: "sankey", data: { labels: [], datasets: [] } } }] }],
} as unknown as SlideLayout;
const mermaidSlide = {
  layout: "columns",
  title: "M",
  columns: [{ title: "A", content: [{ type: "mermaid", code: "graph TD; A-->B" }] }],
} as unknown as SlideLayout;

const frag = (t: SlideTheme, s: SlideLayout, scopeClass = "sc") => generateSlideFragment(t, s, { scopeClass });

// ═══════════════════════════════════════════════════════════
// A fragment is body only — everything shared belongs to the host.
// ═══════════════════════════════════════════════════════════

test("fragment emits no document scaffolding and no shared assets", () => {
  const { html, css } = frag(lightTheme, chartSlide);
  ["<!DOCTYPE", "<html", "<head", "<body", "cdn.tailwindcss.com", "cdn.jsdelivr.net"].forEach((needle) =>
    assert.ok(!html.includes(needle) && !css.includes(needle), `fragment must not carry ${needle}`),
  );
  // The document's reset would break any host that embeds a fragment.
  assert.ok(!css.includes("html, body"), "no html/body reset");
});

test("a chart's config reaches the host as data, so it survives sanitizing", () => {
  // The fragment is deliberately NOT sanitized here — a SlideLayout is user data, and
  // regex-stripping tags is not a security boundary, only one that looks like one. The
  // host sanitizes, which drops the driver script; the attribute is what it hydrates from.
  const { html } = frag(lightTheme, chartSlide);
  assert.ok(html.includes("data-mulmo-chart="), "config rides on the canvas");
  assert.ok(html.includes("<canvas"), "the canvas itself is there to drive");
});

test("fragment reports what the host must load rather than loading it", () => {
  assert.deepStrictEqual(frag(lightTheme, slide).requires, []);
  assert.deepStrictEqual(frag(lightTheme, chartSlide).requires, ["chart"]);
  assert.deepStrictEqual(frag(lightTheme, mermaidSlide).requires, ["mermaid"]);
  assert.deepStrictEqual(frag(lightTheme, chartSlide).chartPlugins, ["https://cdn.jsdelivr.net/npm/chartjs-chart-sankey"]);
});

test("fragment reports the mermaid theme its background needs, and only when needed", () => {
  assert.strictEqual(frag(lightTheme, mermaidSlide).mermaidTheme, "default");
  assert.strictEqual(frag(darkTheme, mermaidSlide).mermaidTheme, "dark");
  assert.strictEqual(frag(lightTheme, slide).mermaidTheme, undefined);
});

// ═══════════════════════════════════════════════════════════
// Scoping — the reason a fragment exists at all.
// ═══════════════════════════════════════════════════════════

test("the root element carries the scope class its rules are written against", () => {
  const { html, css, scopeClass } = frag(lightTheme, slide, "mulmo-slide-7");
  assert.strictEqual(scopeClass, "mulmo-slide-7");
  assert.ok(html.startsWith('<div class="mulmo-slide-7 '), "scope class leads the root class list");
  assert.ok(css.startsWith(".mulmo-slide-7{--d-"), "theme variables land on that element");
});

test("every rule in a fragment is confined to its scope class", () => {
  const themed = { ...lightTheme, titleGradient: "linear-gradient(90deg,#fff,#000)", cardStyle: "glass" } as unknown as SlideTheme;
  const { css } = generateSlideFragment(themed, { ...slide, density: "compact", intro: "fade", staggerMs: 120 } as SlideLayout, {
    scopeClass: "sc",
  });
  css
    .replace(/@keyframes [a-zA-Z]+\{[^}]*\}[^}]*\}/g, "") // keyframes are global by nature and name-spaced already
    .split("}")
    .map((r) => r.split("{")[0])
    .filter(Boolean)
    .flatMap((sel) => sel.split(","))
    .forEach((sel) => assert.ok(sel.trim().startsWith(".sc"), `unscoped selector: "${sel.trim()}"`));
});

test("two slides on one page do not overwrite each other's rules", () => {
  // The bug this API exists to prevent: `.mulmo-intro{...}` is global in a document,
  // so the second slide's preset would win for both.
  const a = generateSlideFragment(lightTheme, { ...slide, intro: "fade" } as SlideLayout, { scopeClass: "s1" });
  const b = generateSlideFragment(darkTheme, { ...slide, intro: "zoom-in" } as SlideLayout, { scopeClass: "s2" });
  assert.ok(a.css.includes(".s1.mulmo-intro{animation:mulmoIntroFade"));
  assert.ok(b.css.includes(".s2.mulmo-intro{animation:mulmoIntroZoomIn"));
  assert.ok(!a.css.includes(".s2") && !b.css.includes(".s1"), "neither reaches the other");
  // Different themes, so the same class must resolve to different colours per slide.
  assert.ok(a.css.includes("--d-bg:#FFFBEB") && b.css.includes("--d-bg:#0F172A"));
});

test("scope class is deterministic after resetSlideIdCounter", () => {
  const run = () => {
    resetSlideIdCounter();
    return [generateSlideFragment(lightTheme, slide).scopeClass, generateSlideFragment(lightTheme, slide).scopeClass];
  };
  assert.deepStrictEqual(run(), ["mulmo-slide-0", "mulmo-slide-1"]);
  assert.deepStrictEqual(run(), ["mulmo-slide-0", "mulmo-slide-1"]);
});

// ═══════════════════════════════════════════════════════════
// The fragment and the document must render the same slide.
// ═══════════════════════════════════════════════════════════

test("fragment body is the document body, modulo the scope class", () => {
  const cases: [SlideTheme, SlideLayout][] = [
    [lightTheme, slide],
    [lightTheme, { ...slide, density: "compact", intro: "fade" } as SlideLayout],
    [darkTheme, chartSlide],
    [lightTheme, mermaidSlide],
  ];
  cases.forEach(([t, s], i) => {
    resetSlideIdCounter();
    const doc = generateSlideHTML(t, s, "ref");
    resetSlideIdCounter();
    const { html } = generateSlideFragment(t, s, { reference: "ref", scopeClass: "sc" });
    const docBody = doc.slice(doc.indexOf('<body class="h-full">\n') + '<body class="h-full">\n'.length, doc.indexOf("\n</body>"));
    assert.strictEqual(html.replace('<div class="sc ', '<div class="'), docBody, `case ${i}`);
  });
});

// ═══════════════════════════════════════════════════════════
// The static stylesheet has to cover every class the deck emits.
// A missing rule renders unstyled, which no other test would notice.
// ═══════════════════════════════════════════════════════════

/** Comments carry example class names (`text-d-color`), which are not emitted classes. */
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const srcFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return srcFiles(full);
    // theme_css.ts defines the utilities; scanning it would be circular.
    return name.endsWith(".ts") && name !== "theme_css.ts" ? [full] : [];
  });

test("slideUtilityCss covers every d-* class the source emits", () => {
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const source = srcFiles(srcDir)
    .map((f) => stripComments(readFileSync(f, "utf8")))
    .join("\n");

  const literal = [...source.matchAll(/\b([a-z][a-z-]*)-d-([a-z]+)(?:\/(\d+))?/g)].map(([, prefix, seg, pct]) =>
    pct ? `.${prefix}-d-${seg}\\/${pct}{` : `.${prefix}-d-${seg}{`,
  );
  const missing = [...new Set(literal)].filter((sel) => !slideUtilityCss.includes(sel));
  assert.deepStrictEqual(missing, [], `slideUtilityCss is missing rules for: ${missing.join(", ")}`);

  // Colours also reach classes through `${c(key)}`, where the key is only known at
  // runtime — so every segment must exist for each of those prefixes.
  const dynamicPrefixes = [...new Set([...source.matchAll(/\b([a-z][a-z-]*)-\$\{c\(/g)].map(([, p]) => p))];
  assert.ok(dynamicPrefixes.length > 0, "expected dynamic color classes to exist");
  const allSegments = [...new Set([...slideUtilityCss.matchAll(/\.bg-d-([a-z]+)\{/g)].map(([, s]) => s))];
  assert.ok(allSegments.length >= 13, `expected 13 colour segments, found ${allSegments.length}`);
  dynamicPrefixes.forEach((prefix) => allSegments.forEach((seg) => assert.ok(slideUtilityCss.includes(`.${prefix}-d-${seg}{`), `missing .${prefix}-d-${seg}`)));
});

test("slideUtilityCss covers every font-* class the source emits", () => {
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
  const source = srcFiles(srcDir)
    .map((f) => stripComments(readFileSync(f, "utf8")))
    .join("\n");
  const fonts = [...new Set([...source.matchAll(/\bfont-(title|body|mono|accent)\b/g)].map(([, f]) => f))];
  assert.ok(fonts.length > 0);
  fonts.forEach((f) => assert.ok(slideUtilityCss.includes(`.font-${f}{font-family:var(--d-font-${f})}`), `missing .font-${f}`));
});

test("buildThemeVars declares every colour, and omits the accent font unless set", () => {
  const vars = buildThemeVars(lightTheme);
  ["--d-bg:#FFFBEB", "--d-card:#FFFFFF", "--d-alt:#FEF3C7", "--d-text:#1C1917", "--d-muted:#57534E", "--d-dim:#A8A29E"].forEach((d) =>
    assert.ok(vars.includes(d), `missing ${d}`),
  );
  assert.strictEqual((vars.match(/--d-[a-z]+:#/g) ?? []).length, 13, "all 13 theme colours");
  assert.ok(vars.includes("--d-font-title:Georgia,serif"));
  assert.ok(vars.includes("--d-font-body:Calibri,Arial,sans-serif"));
  assert.ok(!vars.includes("--d-font-accent"), "absent accent font must stay absent, so font-accent inherits");

  const withAccent = buildThemeVars({ ...lightTheme, fonts: { ...lightTheme.fonts, accent: "Outfit" } } as unknown as SlideTheme);
  assert.ok(withAccent.includes("--d-font-accent:Outfit,ui-sans-serif,system-ui,sans-serif"));
});
