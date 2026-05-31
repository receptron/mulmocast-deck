import type { TitleSlide } from "../schema.js";
import { renderInlineMarkup, accentBar, renderEyebrow, renderChipRow, resolveAccent, dp } from "../utils.js";

/**
 * h1 font-size for the title layout, keyed by titleSize variant.
 * Tuned to match reveal.js scale (base 30px × multiplier): default ≈ 2em, hero ≈ 2.5em.
 */
const TITLE_H1_CLS: Record<"small" | "default" | "large" | "hero", string> = {
  small: "text-[48px]",
  default: "text-[60px]",
  large: "text-[68px]",
  hero: "text-[76px]",
};

export const layoutTitle = (data: TitleSlide): string => {
  const accent = resolveAccent(data.accentColor);
  const eyebrowHtml = renderEyebrow(data.eyebrow, accent);
  const chipsHtml = renderChipRow(data.chips);
  const titleCls = TITLE_H1_CLS[data.titleSize ?? "default"];
  return [
    accentBar("primary"),
    `<div class="absolute -top-20 -right-8 w-[360px] h-[360px] rounded-full bg-d-primary opacity-10"></div>`,
    `<div class="absolute -bottom-12 -left-16 w-[280px] h-[280px] rounded-full bg-d-accent opacity-10"></div>`,
    `<div class="flex flex-col justify-center h-full px-16 relative z-10">`,
    eyebrowHtml ? `  <div class="mb-4">${eyebrowHtml}</div>` : "",
    `  <h1 class="${titleCls} leading-tight font-title font-bold text-d-text"${dp("title")}>${renderInlineMarkup(data.title)}</h1>`,
    data.subtitle ? `  <p class="text-2xl text-d-muted mt-6 font-body"${dp("subtitle")}>${renderInlineMarkup(data.subtitle)}</p>` : "",
    data.author ? `  <p class="text-lg text-d-dim mt-10 font-body"${dp("author")}>${renderInlineMarkup(data.author)}</p>` : "",
    data.note
      ? `  <div class="bg-d-card px-4 py-2 mt-6 inline-block rounded"><p class="text-sm text-d-dim font-body"${dp("note")}>${renderInlineMarkup(data.note)}</p></div>`
      : "",
    chipsHtml,
    `</div>`,
    accentBar("accent", "absolute bottom-0 left-0 right-0"),
  ]
    .filter(Boolean)
    .join("\n");
};
