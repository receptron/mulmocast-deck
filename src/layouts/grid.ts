import type { GridSlide } from "../schema.js";
import { renderInlineMarkup, cardWrap, numBadge, iconSquare, slideHeader, resolveAccent, dp } from "../utils.js";
import { renderCardContentBlocks } from "../blocks.js";

export const layoutGrid = (data: GridSlide): string => {
  const nCols = data.gridColumns || 3;
  const parts: string[] = [slideHeader(data)];

  parts.push(`<div class="grid grid-cols-${nCols} gap-4 px-12 mt-5 flex-1 min-h-0 overflow-hidden content-center">`);

  (data.items || []).forEach((item, i) => {
    const itemAccent = resolveAccent(item.accentColor);
    const inner: string[] = [];
    const base = `items[${i}]`;
    const dpTitle = dp(`${base}.title`);

    if (item.icon) {
      inner.push(`<div class="flex flex-col items-center mb-2">`);
      inner.push(`  ${iconSquare(item.icon, itemAccent)}`);
      inner.push(`</div>`);
      inner.push(`<h3 class="text-lg font-bold text-d-text text-center font-body"${dpTitle}>${renderInlineMarkup(item.title)}</h3>`);
    } else if (item.num != null) {
      inner.push(`<div class="flex items-center gap-3">`);
      inner.push(`  ${numBadge(item.num, itemAccent)}`);
      inner.push(`  <h3 class="text-sm font-bold text-d-text font-body"${dpTitle}>${renderInlineMarkup(item.title)}</h3>`);
      inner.push(`</div>`);
    } else {
      inner.push(`<h3 class="text-lg font-bold text-d-text font-body"${dpTitle}>${renderInlineMarkup(item.title)}</h3>`);
    }

    if (item.description) {
      inner.push(`<p class="text-sm text-d-muted font-body mt-3"${dp(`${base}.description`)}>${renderInlineMarkup(item.description)}</p>`);
    }

    if (item.content) {
      inner.push(`<div class="mt-3 space-y-3 flex-1 min-h-0 overflow-hidden flex flex-col">${renderCardContentBlocks(item.content, `${base}.content`)}</div>`);
    }

    // Asymmetric grids: items can span multiple columns. Class names are mapped explicitly so the JIT compiler keeps them.
    const SPAN_CLS: Record<number, string> = { 1: "", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4" };
    const spanCls = item.span && item.span > 1 ? SPAN_CLS[item.span] || "" : "";
    parts.push(cardWrap(itemAccent, inner.join("\n"), spanCls));
  });

  parts.push(`</div>`);

  if (data.footer) {
    parts.push(`<p class="text-xs text-d-dim font-body px-12 pb-3"${dp("footer")}>${renderInlineMarkup(data.footer)}</p>`);
  }

  return parts.join("\n");
};
