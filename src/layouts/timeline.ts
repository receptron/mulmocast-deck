import type { TimelineSlide } from "../schema.js";
import { renderInlineMarkup, c, resolveItemColor, centeredSlideHeader, dp } from "../utils.js";

export const layoutTimeline = (data: TimelineSlide): string => {
  const parts: string[] = [];
  const items = data.items || [];

  parts.push(centeredSlideHeader(data));

  // Timeline items
  parts.push(`<div class="flex items-start mt-10 relative">`);
  parts.push(`<div class="absolute left-4 right-4 top-[52px] h-[2px] bg-d-alt"></div>`);

  items.forEach((item, i) => {
    const baseColor = resolveItemColor(item.color, data.accentColor);
    // 'hot' items are emphasized — keep the configured color when set, else fall back to warning (amber) for visibility.
    const color = item.hot ? item.color || "warning" : baseColor;
    const dotBorder = item.done ? `bg-${c(color)}` : `bg-d-alt`;
    const dotInner = item.done ? "bg-d-text" : `bg-${c(color)}`;
    const hotRing = item.hot ? ` ring-2 ring-${c(color)} ring-offset-2 ring-offset-d-bg` : "";
    const base = `items[${i}]`;
    parts.push(`<div class="flex-1 flex flex-col items-center text-center relative z-10">`);
    parts.push(`  <div class="w-10 h-10 rounded-full ${dotBorder} flex items-center justify-center shadow-lg${hotRing}">`);
    parts.push(`    <div class="w-4 h-4 rounded-full ${dotInner}"></div>`);
    parts.push(`  </div>`);
    parts.push(`  <p class="text-sm font-bold text-${c(color)} font-body mt-4"${dp(`${base}.date`)}>${renderInlineMarkup(item.date)}</p>`);
    parts.push(`  <p class="text-base font-bold text-d-text font-body mt-2"${dp(`${base}.title`)}>${renderInlineMarkup(item.title)}</p>`);
    if (item.description) {
      parts.push(`  <p class="text-sm text-d-muted font-body mt-1 px-3"${dp(`${base}.description`)}>${renderInlineMarkup(item.description)}</p>`);
    }
    parts.push(`</div>`);
  });

  parts.push(`</div>`);
  parts.push(`</div>`);
  return parts.join("\n");
};
