import type { FigureSlide } from "../schema.js";
import { slideHeader, blockTitle } from "../utils.js";
import { renderContentBlock } from "../blocks.js";

/**
 * The block's own title is drawn here, above the box, rather than by the block: `buildFigureCss`
 * pins the mermaid container to the box with `inset:0`, which would cover a title inside it.
 */
export const layoutFigure = (data: FigureSlide): string =>
  [
    slideHeader(data),
    `<div class="flex-1 min-h-0 flex flex-col mx-12 mt-5 mb-8">`,
    blockTitle(data.figure.title),
    `<div class="mulmo-figure relative flex-1 min-h-0 flex flex-col">`,
    renderContentBlock({ ...data.figure, title: undefined }, "figure"),
    `</div>`,
    `</div>`,
  ].join("\n");
