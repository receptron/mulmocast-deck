import type { ComparisonSlide, ComparisonPanel } from "../schema.js";
import { renderInlineMarkup, c, accentBar, slideHeader, renderOptionalCallout, resolveAccent } from "../utils.js";
import { renderContentBlocks } from "../blocks.js";

const buildPanel = (panel: ComparisonPanel): string => {
  const accent = resolveAccent(panel.accentColor);
  const inner: string[] = [];

  inner.push(`<h3 class="text-xl font-bold text-${c(accent)} font-body">${renderInlineMarkup(panel.title)}</h3>`);

  if (panel.content) {
    inner.push(`<div class="mt-5 space-y-4 flex-1 min-h-0 overflow-auto flex flex-col">`);
    inner.push(renderContentBlocks(panel.content));
    inner.push(`</div>`);
  }

  if (panel.footer) {
    inner.push(`<p class="text-sm text-d-dim font-body mt-auto pt-3">${renderInlineMarkup(panel.footer)}</p>`);
  }

  // Tailwind's arbitrary `flex-[1.5]` works at runtime but stops short of clean class sanitization;
  // emitting `flex-grow` inline keeps the output predictable and avoids depending on JIT mode.
  const flexStyle = panel.ratio !== undefined ? ` style="flex-grow:${panel.ratio};flex-shrink:1;flex-basis:0"` : "";
  const flexCls = panel.ratio !== undefined ? "" : " flex-1";
  return `<div class="bg-d-card rounded-lg shadow-lg overflow-hidden flex flex-col min-h-0${flexCls}"${flexStyle}>
  ${accentBar(accent)}
  <div class="p-5 flex flex-col flex-1 min-h-0 overflow-hidden">
${inner.join("\n")}
  </div>
</div>`;
};

export const layoutComparison = (data: ComparisonSlide): string => {
  const parts: string[] = [slideHeader(data)];

  parts.push(`<div class="flex gap-5 px-12 mt-5 flex-1 min-h-0 items-start">`);
  parts.push(buildPanel(data.left));
  parts.push(buildPanel(data.right));
  parts.push(`</div>`);

  parts.push(renderOptionalCallout(data.callout));

  return parts.join("\n");
};
