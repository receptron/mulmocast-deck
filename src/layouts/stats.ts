import type { StatsSlide } from "../schema.js";
import { renderInlineMarkup, c, resolveItemColor, resolveChangeColor, centeredSlideHeader, renderOptionalCallout, dp } from "../utils.js";

export const layoutStats = (data: StatsSlide): string => {
  const stats = data.stats || [];
  const parts: string[] = [];

  parts.push(centeredSlideHeader(data));

  // Stats cards
  parts.push(`<div class="flex gap-6 mt-10">`);

  stats.forEach((stat, i) => {
    const color = resolveItemColor(stat.color, data.accentColor);
    const base = `stats[${i}]`;
    parts.push(`<div class="flex-1 bg-d-card rounded-lg shadow-lg p-10 text-center">`);
    parts.push(`  <div class="h-[3px] bg-${c(color)} rounded-full w-12 mx-auto mb-6"></div>`);
    if (stat.numLabel) {
      parts.push(
        `  <p class="font-accent font-extrabold text-${c(color)} text-sm tracking-wider mb-2"${dp(`${base}.numLabel`)}>${renderInlineMarkup(stat.numLabel)}</p>`,
      );
    }
    parts.push(`  <p class="text-[52px] font-bold text-${c(color)} font-body leading-none"${dp(`${base}.value`)}>${renderInlineMarkup(stat.value)}</p>`);
    parts.push(`  <p class="text-lg text-d-muted font-body mt-4"${dp(`${base}.label`)}>${renderInlineMarkup(stat.label)}</p>`);
    if (stat.change) {
      parts.push(
        `  <p class="text-base font-bold text-${c(resolveChangeColor(stat.change))} font-body mt-3"${dp(`${base}.change`)}>${renderInlineMarkup(stat.change)}</p>`,
      );
    }
    parts.push(`</div>`);
  });

  parts.push(`</div>`);
  parts.push(`</div>`);

  parts.push(renderOptionalCallout(data.callout));

  return parts.join("\n");
};
