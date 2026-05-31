import type { ContentBlock, BulletItem, SectionBlock, TableBlock, TableCellValue, TextSize } from "./schema.js";
import { escapeHtml, c, generateSlideId, renderInlineMarkup, blockTitle, resolveChangeColor, resolveAccent } from "./utils.js";

/**
 * Map a TextSize variant to its Tailwind classes.
 * default — body / muted (the original 0.1.x behavior; emitted only when neither size nor numeric fontSize is set).
 * lead    — slightly larger muted intro paragraph.
 * big     — larger, full text color.
 * sub     — smaller, dimmer card footnote.
 */
const TEXT_SIZE_STYLES: Record<TextSize | "default", { fontCls: string; colorCls?: string }> = {
  default: { fontCls: "text-[15px]", colorCls: "text-d-muted" },
  lead: { fontCls: "text-[17px] leading-relaxed", colorCls: "text-d-muted" },
  big: { fontCls: "text-[19px] leading-snug", colorCls: "text-d-text" },
  sub: { fontCls: "text-[13px] leading-snug", colorCls: "text-d-dim" },
};

// ─── Table cell rendering (shared with layouts/table.ts) ───

export const resolveCellColor = (cellObj: { color?: string }, isRowHeader: boolean): string => {
  if (cellObj.color) return `text-${c(cellObj.color)}`;
  if (isRowHeader) return "text-d-text";
  return "text-d-muted";
};

export const renderBadge = (text: string, color: string): string => {
  return `<span class="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-${c(color)}">${renderInlineMarkup(text)}</span>`;
};

export const renderCellValue = (cell: TableCellValue, isRowHeader: boolean): string => {
  const cellObj = typeof cell === "object" && cell !== null ? cell : { text: String(cell) };
  if (cellObj.badge && cellObj.color) {
    return `<td class="px-4 py-3 text-sm font-body border-b border-d-alt">${renderBadge(cellObj.text, cellObj.color)}</td>`;
  }
  const colorCls = resolveCellColor(cellObj, isRowHeader);
  const boldCls = cellObj.bold || isRowHeader ? "font-bold" : "";
  return `<td class="px-4 py-3 text-sm ${colorCls} ${boldCls} font-body border-b border-d-alt">${renderInlineMarkup(cellObj.text)}</td>`;
};

export const renderTableCore = (headers: string[] | undefined, rows: TableCellValue[][], rowHeaders?: boolean, striped?: boolean): string => {
  const parts: string[] = [];
  const isStriped = striped !== false;

  parts.push(`<table class="w-full border-collapse">`);

  if (headers && headers.length > 0) {
    parts.push(`<thead>`);
    parts.push(`<tr>`);
    headers.forEach((h) => {
      parts.push(`  <th class="text-left px-4 py-3 text-sm font-bold text-d-text font-body border-b-2 border-d-alt">${renderInlineMarkup(h)}</th>`);
    });
    parts.push(`</tr>`);
    parts.push(`</thead>`);
  }

  parts.push(`<tbody>`);
  rows.forEach((row, ri) => {
    const bgCls = isStriped && ri % 2 === 1 ? "bg-d-alt/30" : "";
    parts.push(`<tr class="${bgCls}">`);
    (row || []).forEach((cell, ci) => {
      const isRowHeader = ci === 0 && !!rowHeaders;
      parts.push(`  ${renderCellValue(cell, isRowHeader)}`);
    });
    parts.push(`</tr>`);
  });
  parts.push(`</tbody>`);

  parts.push(`</table>`);
  return parts.join("\n");
};

const renderTableBlock = (block: TableBlock): string => {
  return `<div class="overflow-auto">${blockTitle(block.title)}${renderTableCore(block.headers, block.rows, block.rowHeaders, block.striped)}</div>`;
};

/** Render a single content block to HTML */
export const renderContentBlock = (block: ContentBlock): string => {
  switch (block.type) {
    case "text":
      return renderText(block);
    case "bullets":
      return renderBullets(block);
    case "code":
      return renderCode(block);
    case "callout":
      return renderCallout(block);
    case "metric":
      return renderMetric(block);
    case "divider":
      return renderDivider(block);
    case "image":
      return renderImage(block);
    case "imageRef":
      return renderImageRefPlaceholder(block);
    case "chart":
      return renderChart(block);
    case "mermaid":
      return renderMermaid(block);
    case "section":
      return renderSection(block);
    case "table":
      return renderTableBlock(block);
    case "tag":
      return renderTag(block);
    default:
      return `<p class="text-sm text-d-muted font-body">[unknown block type]</p>`;
  }
};

/** Render a card-internal accent tag (small uppercase label, sits above an h3). Matches reveal.js .tag. */
const renderTag = (block: ContentBlock & { type: "tag" }): string => {
  const color = c(block.color || "primary");
  return `<span class="text-xs font-bold uppercase tracking-[0.12em] text-${color} font-accent">${renderInlineMarkup(block.text)}</span>`;
};

/** Render an array of content blocks to HTML */
export const renderContentBlocks = (blocks: ContentBlock[]): string => {
  return blocks.map(renderContentBlock).join("\n");
};

/** Render content blocks with fixed aspect-ratio container for image blocks (used in card layouts) */
export const renderCardContentBlocks = (blocks: ContentBlock[]): string => {
  return blocks
    .map((block) => {
      if (block.type === "image") {
        return `<div class="aspect-video shrink-0 overflow-hidden">${renderContentBlock(block)}</div>`;
      }
      return renderContentBlock(block);
    })
    .join("\n");
};

/** When the author explicitly sets color/dim, honor it; otherwise inherit from the size variant's default. */
const resolveTextColor = (block: ContentBlock & { type: "text" }): string | undefined => {
  if (block.color) return `text-${c(block.color)}`;
  if (block.dim) return "text-d-dim";
  return undefined;
};

const resolveAlign = (align: string | undefined): string => {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "";
};

const renderText = (block: ContentBlock & { type: "text" }): string => {
  // Resolution order for size: explicit numeric `fontSize` (legacy) wins over new `size` variant.
  const legacyXl = block.fontSize !== undefined && block.fontSize >= 18;
  const style = TEXT_SIZE_STYLES[block.size ?? "default"];
  const sizeCls = legacyXl ? "text-xl" : style.fontCls;
  const explicitColor = resolveTextColor(block);
  const colorCls = explicitColor ?? style.colorCls ?? "text-d-muted";
  const bold = block.bold ? "font-bold" : "";
  const alignCls = resolveAlign(block.align);
  return `<p class="${sizeCls} ${colorCls} ${bold} ${alignCls} font-body leading-relaxed">${renderInlineMarkup(block.value)}</p>`;
};

/** Extract text from a bullet item (string or object) */
const bulletItemText = (item: BulletItem): string => {
  return typeof item === "string" ? item : item.text;
};

/** Render sub-bullets for a nested bullet item */
const renderSubBullets = (item: BulletItem): string => {
  if (typeof item === "string" || !item.items || item.items.length === 0) return "";
  const subs = item.items
    .map((sub) => {
      return `    <li class="flex gap-2 ml-6 text-[14px]"><span class="text-d-dim shrink-0">\u25E6</span><span>${renderInlineMarkup(bulletItemText(sub))}</span></li>`;
    })
    .join("\n");
  return `\n${subs}`;
};

/** Map a per-item status icon variant to its glyph and color class segment. */
const STATUS_ICON_GLYPHS: Record<"ok" | "no" | "warn", { glyph: string; color: string }> = {
  ok: { glyph: "\u2713", color: "success" }, // \u2713
  no: { glyph: "\u2715", color: "danger" }, // \u2715
  warn: { glyph: "\u26a0", color: "warning" }, // \u26a0
};

/** Resolve the size variant for a bullet item \u2014 per-item size wins over block-level size. */
const resolveBulletSize = (block: ContentBlock & { type: "bullets" }, item: BulletItem): TextSize | "default" => {
  if (typeof item === "object" && item.size) return item.size;
  return block.size ?? "default";
};

const renderBullets = (block: ContentBlock & { type: "bullets" }): string => {
  const tag = block.ordered ? "ol" : "ul";
  const blockStyle = TEXT_SIZE_STYLES[block.size ?? "default"];
  const items = block.items
    .map((item, i) => {
      // Per-item status icon overrides the block-level marker / numbered prefix.
      const statusIcon = typeof item === "object" && item.icon ? STATUS_ICON_GLYPHS[item.icon] : undefined;
      const markerHtml = statusIcon
        ? `<span class="text-${c(statusIcon.color)} font-extrabold shrink-0">${statusIcon.glyph}</span>`
        : `<span class="text-d-dim shrink-0">${block.ordered ? `${i + 1}.` : escapeHtml(block.icon || "\u2022")}</span>`;
      const text = bulletItemText(item);
      const subHtml = renderSubBullets(item);
      const itemStyle = TEXT_SIZE_STYLES[resolveBulletSize(block, item)];
      // Emit per-item classes only when they differ from the block-level style so output stays compact in the common case.
      const itemCls =
        itemStyle.fontCls === blockStyle.fontCls && itemStyle.colorCls === blockStyle.colorCls ? "" : ` ${itemStyle.fontCls} ${itemStyle.colorCls}`;
      return `  <li class="flex flex-col gap-1${itemCls}"><div class="flex gap-2">${markerHtml}<span>${renderInlineMarkup(text)}</span></div>${subHtml}</li>`;
    })
    .join("\n");
  return `<${tag} class="space-y-2 ${blockStyle.fontCls} ${blockStyle.colorCls} font-body">\n${items}\n</${tag}>`;
};

const renderCode = (block: ContentBlock & { type: "code" }): string => {
  return `<pre class="bg-[#0D1117] p-4 rounded text-sm font-mono text-d-dim leading-relaxed whitespace-pre-wrap">${escapeHtml(block.code)}</pre>`;
};

const renderCallout = (block: ContentBlock & { type: "callout" }): string => {
  const isQuote = block.style === "quote";
  const resolveBorderCls = (style: "quote" | "info" | "warning" | undefined): string => {
    if (style === "warning") return `border-l-2 border-${c("warning")}`;
    if (style === "info") return `border-l-2 border-${c("info")}`;
    return "";
  };
  const borderCls = resolveBorderCls(block.style);
  const bg = isQuote ? "bg-d-alt" : "bg-d-card";
  // Pre-Phase-4 default was `text-sm` (~14px). Map to the size variants only when explicitly requested.
  const sizeStyle = block.size ? TEXT_SIZE_STYLES[block.size] : { fontCls: "text-sm", colorCls: "text-d-muted" };
  const textCls = isQuote ? `italic ${sizeStyle.colorCls}` : sizeStyle.colorCls;
  const content = block.label
    ? `<span class="font-bold text-${c(block.color || "warning")}">${renderInlineMarkup(block.label)}:</span> <span class="${textCls}">${renderInlineMarkup(block.text)}</span>`
    : `<span class="${textCls}">${renderInlineMarkup(block.text)}</span>`;
  return `<div class="${bg} ${borderCls} p-3 rounded ${sizeStyle.fontCls} font-body">${content}</div>`;
};

const renderMetric = (block: ContentBlock & { type: "metric" }): string => {
  const lines: string[] = [];
  lines.push(`<div class="text-center">`);
  lines.push(`  <p class="text-4xl font-bold text-${c(resolveAccent(block.color))}">${renderInlineMarkup(block.value)}</p>`);
  lines.push(`  <p class="text-sm text-d-dim mt-1">${renderInlineMarkup(block.label)}</p>`);
  if (block.change) {
    lines.push(`  <p class="text-sm font-bold text-${c(resolveChangeColor(block.change))} mt-1">${escapeHtml(block.change)}</p>`);
  }
  lines.push(`</div>`);
  return lines.join("\n");
};

const renderDivider = (block: ContentBlock & { type: "divider" }): string => {
  const divColor = block.color ? `bg-${c(block.color)}` : "bg-d-alt";
  return `<div class="h-[2px] ${divColor} my-2 rounded-full"></div>`;
};

const renderImage = (block: ContentBlock & { type: "image" }): string => {
  const fit = block.fit === "cover" ? "object-cover" : "object-contain";
  return `<div class="min-h-0 flex-1 overflow-hidden flex items-center"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || "")}" class="rounded ${fit} w-full h-full" /></div>`;
};

/** Placeholder for unresolved imageRef blocks — should be resolved before rendering */
const renderImageRefPlaceholder = (block: ContentBlock & { type: "imageRef" }): string => {
  return `<div class="min-h-0 flex-1 overflow-hidden flex items-center justify-center bg-d-alt rounded"><p class="text-sm text-d-dim font-body">[imageRef: ${escapeHtml(block.ref)}]</p></div>`;
};

const renderChart = (block: ContentBlock & { type: "chart" }): string => {
  const chartId = generateSlideId("chart");
  const chartData = JSON.stringify(block.chartData);
  return `<div class="flex-1 min-h-0 flex flex-col">
  ${blockTitle(block.title)}
  <div class="flex-1 min-h-0 relative">
    <canvas id="${chartId}" data-chart-ready="false"></canvas>
  </div>
  <script>(function(){
    const ctx=document.getElementById('${chartId}');
    const d=${chartData};
    if(!d.options)d.options={};
    d.options.animation=false;
    d.options.responsive=true;
    d.options.maintainAspectRatio=false;
    new Chart(ctx,d);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ctx.dataset.chartReady="true"}));
  })()</script>
</div>`;
};

const renderMermaid = (block: ContentBlock & { type: "mermaid" }): string => {
  const mermaidId = generateSlideId("mermaid");
  return `<div class="flex-1 min-h-0 flex flex-col">
  ${blockTitle(block.title)}
  <div class="flex-1 min-h-0 flex justify-center items-center">
    <div id="${mermaidId}" class="mermaid">${escapeHtml(block.code)}</div>
  </div>
</div>`;
};

/** Render the text + content blocks inside a section (shared by sidebar/default variants) */
const renderSectionContent = (block: SectionBlock): string => {
  const parts: string[] = [];
  if (block.text) {
    parts.push(`<p class="text-[15px] text-d-muted font-body">${renderInlineMarkup(block.text)}</p>`);
  }
  if (block.content) {
    parts.push(block.content.map(renderContentBlock).join("\n"));
  }
  return parts.join("\n");
};

const renderSectionSidebar = (block: SectionBlock): string => {
  const color = resolveAccent(block.color);
  const chars = block.label
    .split("")
    .map((ch) => escapeHtml(ch))
    .join("<br>");
  const sidebar = `<div class="w-[48px] shrink-0 rounded-l bg-${c(color)} flex items-center justify-center"><span class="text-sm font-bold text-white font-body leading-snug text-center">${chars}</span></div>`;
  return `<div class="flex rounded overflow-hidden bg-d-card">
  ${sidebar}
  <div class="flex-1 space-y-2 p-3">${renderSectionContent(block)}</div>
</div>`;
};

const renderSectionDefault = (block: SectionBlock): string => {
  const color = resolveAccent(block.color);
  const badge = `<span class="min-w-[80px] px-3 py-1 rounded text-sm font-bold text-white bg-${c(color)} shrink-0">${renderInlineMarkup(block.label)}</span>`;
  return `<div class="flex gap-4 items-start">
  ${badge}
  <div class="flex-1 space-y-2">${renderSectionContent(block)}</div>
</div>`;
};

const renderSection = (block: SectionBlock): string => {
  return block.sidebar ? renderSectionSidebar(block) : renderSectionDefault(block);
};
