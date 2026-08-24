import test from "node:test";
import assert from "node:assert";

import { generateSlideHTML, renderInlineMarkup, slideLayoutSchema, type SlideLayout, type SlideTheme } from "../../src/index.js";

// The `data-mulmo-path` contract: a marked element's content IS the stored value, rendered.
// An editor reads that element's innerHTML back into the value, so anything the renderer adds
// inside the marker — a decorative quote, an indent — is captured on the first edit and
// duplicated on every edit after it (issue #32, `bigQuote` shipped exactly that).
//
// The pre-existing marker tests assert only that a path is PRESENT, which cannot see decoration
// sitting next to it. This one pins the content, for every layout.

const theme: SlideTheme = {
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

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Resolve a `data-mulmo-path` (`items[0].title`) against the slide it was emitted from. */
const getByPath = (slide: SlideLayout, path: string): unknown =>
  path.split(".").reduce<unknown>((node, segment) => {
    const [, name, index] = /^([^[]*)(?:\[(\d+)\])?$/.exec(segment) ?? [];
    const named = name && isRecord(node) ? node[name] : node;
    return index === undefined ? named : Array.isArray(named) ? named[Number(index)] : undefined;
  }, slide);

const MARKER = /<([a-zA-Z][\w-]*)\b[^>]*\sdata-mulmo-path="([^"]*)"[^>]*>/g;

type Marker = { path: string; content: string };

/** Every marked element's content, read from the opening tag to the first tag that follows it. */
const markersIn = (html: string): Marker[] => {
  const found: Marker[] = [];
  for (const match of html.matchAll(MARKER)) {
    const start = (match.index ?? 0) + match[0].length;
    const next = html.indexOf("<", start);
    found.push({ path: match[2], content: html.slice(start, next < 0 ? undefined : next) });
  }
  return found;
};

const cases: SlideLayout[] = (
  [
    { layout: "title", eyebrow: { label: "kickoff" }, title: "T", subtitle: "S", author: "A", chips: ["c1", "c2"], note: "N" },
    { layout: "bigQuote", quote: "Q", author: "A", role: "R", eyebrow: { label: "E" } },
    { layout: "columns", title: "T", subtitle: "S", columns: [{ title: "c", body: "b" }] },
    { layout: "comparison", title: "T", left: { title: "L", items: ["a"] }, right: { title: "R", items: ["b"] } },
    { layout: "grid", title: "T", items: [{ title: "g", description: "d" }] },
    { layout: "stats", title: "T", subtitle: "S", stats: [{ numLabel: "01", value: "+42%", label: "Rev", change: "+5%" }] },
    { layout: "timeline", title: "T", items: [{ date: "Q1", title: "k", description: "s" }] },
    { layout: "split", left: { label: "L", title: "LT", subtitle: "LS" }, right: { label: "R", labelBadge: true, title: "RT", subtitle: "RS" } },
    { layout: "matrix", title: "T", xAxis: { low: "lo", high: "hi", label: "x" }, cells: [{ label: "q", items: ["i"] }] },
    { layout: "table", title: "T", headers: ["h"], rows: [["r"]] },
    { layout: "waterfall", title: "T", items: [{ label: "w", value: 10 }] },
    { layout: "funnel", title: "T", stages: [{ label: "f", value: "1" }] },
    { layout: "manifesto", title: "T", items: [{ title: "m", description: "d" }] },
  ] as unknown[]
).map((raw) => slideLayoutSchema.parse(raw));

test("marker contract: every layout is covered by a case", () => {
  const covered = new Set(cases.map((slide) => slide.layout));
  const declared = new Set(slideLayoutSchema.options.map((option) => option.shape.layout.value));
  assert.deepStrictEqual(
    [...declared].filter((layout) => !covered.has(layout)),
    [],
    "add a case for each new layout",
  );
});

cases.forEach((slide) => {
  test(`marker contract: ${slide.layout} marks only the value itself`, () => {
    const html = generateSlideHTML(theme, slide);
    const markers = markersIn(html);
    assert.ok(markers.length > 0, `${slide.layout} emitted no data-mulmo-path`);
    markers.forEach(({ path, content }) => {
      const value = getByPath(slide, path);
      if (typeof value !== "string") return;
      assert.strictEqual(content, renderInlineMarkup(value), `${slide.layout}.${path} carries more than its value`);
    });
  });
});

test("marker contract: bigQuote keeps its decorative quotes outside the marker", () => {
  const slide = slideLayoutSchema.parse({ layout: "bigQuote", quote: "Q" });
  const html = generateSlideHTML(theme, slide);
  assert.ok(
    /&ldquo;<span[^>]*data-mulmo-path="quote"[^>]*>Q<\/span>&rdquo;/.test(html),
    html.slice(html.indexOf("blockquote") - 20, html.indexOf("blockquote") + 320),
  );
});
