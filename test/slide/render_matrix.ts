// Input matrix for the render characterization tests.
//
// These are the axes `generateSlideHTML` actually branches on. Kept as data, and
// separate from any single test, because both the golden test and any future
// before/after comparison need the same inputs — the value of the matrix is that
// nobody has to rediscover which shapes matter.
import type { SlideTheme, SlideLayout } from "../../src/schema.js";
import type { ResolvedBranding } from "../../src/render.js";

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
};
const baseFonts = { title: "Georgia", body: "Calibri", mono: "Consolas" };

export const SAFE_GRAD = "linear-gradient(100deg, #FFF, #38BDF8 60%, #818CF8)";
/** Must be rejected by isSafeCssBackground — exercises the "unsafe → no style block" arm. */
export const UNSAFE_GRAD = "url('http://evil.example/x.png'); } body { display:none } .x{";

const titleGradients = [undefined, SAFE_GRAD, UNSAFE_GRAD];
const cardStyles = [undefined, "glass"] as const;
const themeBgGradients = [undefined, SAFE_GRAD];
const accentFonts = [undefined, "Outfit"];
const densities = [undefined, "compact"] as const;
const intros = [undefined, "fade", "fade-up", "fade-down", "slide-left", "slide-right", "zoom-in"] as const;
/** undefined / falsy-but-not-nullish 0 / negative / positive — the four that separate the stagger branches. */
const staggers = [undefined, 0, -5, 120];

const styleVariants = [
  undefined,
  { bgColor: "0F172A" },
  { bgGradient: SAFE_GRAD },
  { bgGradient: UNSAFE_GRAD, bgColor: "123456" },
  { footer: "Confidential <&>" },
];

const brandings: (ResolvedBranding | undefined)[] = [
  undefined,
  { logo: { dataUrl: "data:image/png;base64,AAA", position: "top-right", width: 120 } },
  { backgroundImage: { dataUrl: "data:image/png;base64,BBB", size: "cover", opacity: 0.4 } },
  // bgOpacity flips hasBgOpacity, which suppresses background styling entirely.
  { backgroundImage: { dataUrl: "data:image/png;base64,CCC", size: "fill", opacity: 1, bgOpacity: 0.6 } },
  {
    logo: { dataUrl: "data:image/png;base64,DDD", position: "bottom-left", width: 80 },
    backgroundImage: { dataUrl: "data:image/png;base64,EEE", size: "contain", opacity: 0.2 },
  },
];

const references = [undefined, "Source: Example 2026 <&>"];

// chartData (not chartType) is what renderChart reads; an earlier fixture spelled it
// wrong, so the chart config path rendered `const d=undefined` and went unmeasured.
const chartBlock = { type: "chart", title: "S", chartData: { type: "sankey", data: { labels: ["a"], datasets: [{ data: [1] }] } } };
const mermaidBlock = { type: "mermaid", code: "graph TD; A-->B" };

/** One minimal slide per layout. Two carry chart / mermaid blocks so buildCdnScripts() is reached. */
const layoutSlides: SlideLayout[] = [
  // chips / eyebrow render the only classes built with an alpha suffix, so a fixture
  // without them leaves those utilities unmeasured.
  { layout: "title", title: "T", subtitle: "S", author: "A", note: "N", eyebrow: { label: "EY" }, chips: ["c1", "c2"] },
  { layout: "bigQuote", quote: "Q", attribution: "X", eyebrow: { label: "EY2", color: "info" } },
  { layout: "columns", title: "C", columns: [{ title: "A", content: [chartBlock] }, { title: "B" }] },
  { layout: "comparison", title: "Cmp", left: { title: "L", content: [mermaidBlock] }, right: { title: "R" } },
  {
    layout: "stats",
    title: "St",
    stats: [
      { value: "1", label: "one" },
      { value: "2", label: "two" },
    ],
  },
  { layout: "table", title: "Tb", headers: ["h1", "h2"], rows: [["a", "b"]] },
  { layout: "timeline", title: "Tl", items: [{ label: "L1", description: "D1" }] },
  { layout: "matrix", title: "Mx", cells: [{ title: "c1" }, { title: "c2" }, { title: "c3" }, { title: "c4" }] },
  { layout: "grid", title: "Gr", items: [{ title: "g1" }, { title: "g2" }] },
  { layout: "split", title: "Sp", left: { title: "L" }, right: { title: "R" } },
  {
    layout: "funnel",
    title: "Fn",
    stages: [
      { label: "s1", value: "10" },
      { label: "s2", value: "5" },
    ],
  },
  {
    layout: "waterfall",
    title: "Wf",
    items: [
      { label: "w1", value: 10 },
      { label: "w2", value: -3 },
    ],
  },
  { layout: "manifesto", title: "Mf", lines: [{ text: "l1" }, { text: "l2" }] },
] as unknown as SlideLayout[];

export type RenderCase = {
  tag: string;
  theme: SlideTheme;
  slide: SlideLayout;
  reference?: string;
  branding?: ResolvedBranding;
};

const mkTheme = (tg?: string, cs?: string, bg?: string, af?: string): SlideTheme =>
  ({
    colors: baseColors,
    fonts: { ...baseFonts, ...(af ? { accent: af } : {}) },
    ...(tg ? { titleGradient: tg } : {}),
    ...(cs ? { cardStyle: cs } : {}),
    ...(bg ? { bgGradient: bg } : {}),
  }) as unknown as SlideTheme;

const buildMatrix = (): RenderCase[] => {
  const cases: RenderCase[] = [];

  // Sweep A — exhaustive over the axes the four optional <style> builders read.
  // The remaining axes rotate so every A-case also carries a different
  // layout / style / branding / reference combination.
  let rot = 0;
  titleGradients.forEach((tg) =>
    cardStyles.forEach((cs) =>
      densities.forEach((den) =>
        intros.forEach((intro) =>
          staggers.forEach((stg) => {
            const i = rot++;
            cases.push({
              tag: `A:tg=${tg ? (tg === SAFE_GRAD ? "safe" : "unsafe") : "none"},cs=${cs},den=${den},intro=${intro},stg=${stg}`,
              theme: mkTheme(tg, cs, themeBgGradients[i % 2], accentFonts[i % 2]),
              slide: {
                ...layoutSlides[i % layoutSlides.length],
                ...(den ? { density: den } : {}),
                ...(intro ? { intro } : {}),
                ...(stg !== undefined ? { staggerMs: stg } : {}),
                ...(styleVariants[i % styleVariants.length] ? { style: styleVariants[i % styleVariants.length] } : {}),
              } as SlideLayout,
              reference: references[i % references.length],
              branding: brandings[i % brandings.length],
            });
          }),
        ),
      ),
    ),
  );

  // Sweep B — every layout against every branding / reference / style / theme-bgGradient.
  layoutSlides.forEach((base) =>
    brandings.forEach((b, bi) =>
      references.forEach((r, ri) =>
        styleVariants.forEach((sv, si) =>
          themeBgGradients.forEach((tbg, gi) => {
            cases.push({
              tag: `B:layout=${(base as { layout: string }).layout},b=${bi},r=${ri},s=${si},g=${gi}`,
              theme: mkTheme(gi ? SAFE_GRAD : undefined, si % 2 ? "glass" : undefined, tbg, undefined),
              slide: { ...base, ...(sv ? { style: sv } : {}), ...(si % 3 === 0 ? { density: "compact" } : {}) } as SlideLayout,
              reference: r,
              branding: b,
            });
          }),
        ),
      ),
    ),
  );

  return cases;
};

export const renderMatrix: RenderCase[] = buildMatrix();
