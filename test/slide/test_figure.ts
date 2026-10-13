import test from "node:test";
import assert from "node:assert";
import { generateSlideFragment } from "../../src/fragment.js";
import { generateSlideHTML } from "../../src/render.js";
import { renderSlideContent } from "../../src/layouts/index.js";
import { slideLayoutSchema, type SlideLayout, type SlideTheme } from "../../src/schema.js";

const theme = {
  colors: {
    bg: "0F172A",
    bgCard: "1E293B",
    bgCardAlt: "334155",
    text: "F8FAFC",
    textMuted: "CBD5E1",
    textDim: "94A3B8",
    primary: "3B82F6",
    accent: "A855F7",
    success: "10B981",
    warning: "F59E0B",
    danger: "EF4444",
    info: "06B6D4",
    highlight: "EC4899",
  },
  fonts: { title: "Georgia", body: "Inter", mono: "Consolas" },
} as unknown as SlideTheme;

const chartFigure = slideLayoutSchema.parse({
  layout: "figure",
  title: "Revenue",
  figure: { type: "chart", chartData: { type: "sankey", data: { datasets: [] } } },
});
const mermaidFigure = slideLayoutSchema.parse({ layout: "figure", title: "Flow", figure: { type: "mermaid", code: "graph TD; A-->B" } });
const mermaidColumns = slideLayoutSchema.parse({
  layout: "columns",
  title: "Flow",
  columns: [{ title: "c", content: [{ type: "mermaid", code: "graph TD; A-->B" }] }],
});

const FIGURE_RULE = ".mulmo-figure .mermaid{position:absolute";

test("figure schema: accepts a chart or a mermaid block", () => {
  assert.strictEqual(chartFigure.layout, "figure");
  assert.strictEqual(mermaidFigure.layout, "figure");
});

test("figure schema: rejects every other block type, and a missing figure", () => {
  const reject = (raw: unknown) => assert.strictEqual(slideLayoutSchema.safeParse(raw).success, false, JSON.stringify(raw));
  reject({ layout: "figure", title: "T", figure: { type: "text", value: "x" } });
  reject({ layout: "figure", title: "T", figure: { type: "image", src: "a.png" } });
  reject({ layout: "figure", title: "T" });
  reject({ layout: "figure", figure: { type: "mermaid", code: "graph TD; A-->B" } });
});

test("figure layout: the block sits in the growing box under the header", () => {
  const html = renderSlideContent(chartFigure);
  const box = html.indexOf('class="mulmo-figure relative flex-1 min-h-0');
  assert.ok(box > html.indexOf(">Revenue<"), "the box follows the header");
  assert.ok(html.indexOf("data-mulmo-chart=") > box, "the canvas is inside the box");
});

test("figure layout: a block title sits above the box the diagram fills, not inside it", () => {
  [
    { type: "mermaid", title: "Block", code: "graph TD; A-->B" },
    { type: "chart", title: "Block", chartData: { type: "bar" } },
  ].forEach((figure) => {
    const html = renderSlideContent(slideLayoutSchema.parse({ layout: "figure", title: "T", figure }));
    const title = html.indexOf(">Block<");
    const box = html.indexOf('class="mulmo-figure relative');
    assert.ok(title > 0 && box > title, `${figure.type}: the title precedes the box`);
    assert.strictEqual(html.split(">Block<").length - 1, 1, `${figure.type}: the title is drawn once`);
  });
});

test("figure layout: the header carries title and subtitle markers", () => {
  const html = renderSlideContent(slideLayoutSchema.parse({ layout: "figure", title: "T", subtitle: "S", figure: { type: "mermaid", code: "x" } }));
  assert.ok(html.includes('data-mulmo-path="title"'));
  assert.ok(html.includes('data-mulmo-path="subtitle"'));
});

test("figure layout: mermaid code is escaped", () => {
  const html = renderSlideContent(slideLayoutSchema.parse({ layout: "figure", title: "T", figure: { type: "mermaid", code: "</div><img onerror=x>" } }));
  assert.ok(!html.includes("<img"));
});

test("figure fragment: reports the runtimes and plugins its block needs", () => {
  const chart = generateSlideFragment(theme, chartFigure);
  assert.deepStrictEqual(chart.requires, ["chart"]);
  assert.strictEqual(chart.chartPlugins.length, 1);
  const mermaid = generateSlideFragment(theme, mermaidFigure);
  assert.deepStrictEqual(mermaid.requires, ["mermaid"]);
  assert.strictEqual(mermaid.mermaidTheme, "dark");
});

test("figure css: scoped in a fragment, unscoped in a document", () => {
  const fragment = generateSlideFragment(theme, mermaidFigure, { scopeClass: "s1" });
  assert.ok(fragment.css.includes(`.s1 ${FIGURE_RULE}`), fragment.css);
  assert.ok(generateSlideHTML(theme, mermaidFigure).includes(`<style>${FIGURE_RULE}`));
});

test("figure css: emitted for figure slides only", () => {
  const others: SlideLayout[] = [mermaidColumns, slideLayoutSchema.parse({ layout: "title", title: "T" })];
  others.forEach((slide) => {
    assert.ok(!generateSlideFragment(theme, slide).css.includes(".mulmo-figure"), slide.layout);
    assert.ok(!generateSlideHTML(theme, slide).includes(".mulmo-figure"), slide.layout);
  });
});
