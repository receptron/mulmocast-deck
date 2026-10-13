import type { FigureSlide } from "../schema.js";
import { slideHeader } from "../utils.js";
import { renderContentBlock } from "../blocks.js";

/**
 * Margins rather than padding: `buildFigureCss` pins the mermaid container to this box with
 * `inset:0`, which measures from the padding edge and would swallow padding.
 */
export const layoutFigure = (data: FigureSlide): string =>
  [
    slideHeader(data),
    `<div class="mulmo-figure relative flex-1 min-h-0 flex flex-col mx-12 mt-5 mb-8">`,
    renderContentBlock(data.figure, "figure"),
    `</div>`,
  ].join("\n");
