import type { ManifestoSlide, ManifestoLine } from "../schema.js";
import { renderInlineMarkup, c, slideHeader, renderOptionalCallout, resolveItemColor, dp } from "../utils.js";

const buildManifestoCard = (line: ManifestoLine, slideAccent: string | undefined, basePath: string): string => {
  const color = resolveItemColor(line.accentColor, slideAccent);
  const parts: string[] = [];
  parts.push(`<div class="relative bg-d-card rounded-lg shadow-md overflow-hidden flex flex-col">`);
  parts.push(`  <div class="absolute left-0 top-0 bottom-0 w-1 bg-${c(color)}"></div>`);
  parts.push(`  <div class="px-5 py-4 pl-6 flex-1">`);
  parts.push(`    <h3 class="text-lg font-bold text-d-text font-body leading-snug"${dp(`${basePath}.title`)}>${renderInlineMarkup(line.title)}</h3>`);
  if (line.description) {
    parts.push(
      `    <p class="text-sm text-d-muted font-body mt-1 leading-relaxed"${dp(`${basePath}.description`)}>${renderInlineMarkup(line.description)}</p>`,
    );
  }
  parts.push(`  </div>`);
  parts.push(`</div>`);
  return parts.join("\n");
};

const DEFAULT_COLUMNS = 2;
const MAX_COLUMNS = 4;

const gridColsClass = (columns: number): string => {
  // Tailwind requires literal class names — map explicitly.
  const cls: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };
  return cls[columns] || cls[DEFAULT_COLUMNS];
};

export const layoutManifesto = (data: ManifestoSlide): string => {
  const cols = Math.min(Math.max(data.columns ?? DEFAULT_COLUMNS, 1), MAX_COLUMNS);
  const items = data.items || [];
  const parts: string[] = [slideHeader(data)];
  parts.push(`<div class="grid ${gridColsClass(cols)} gap-4 px-12 mt-5 flex-1 min-h-0 content-start">`);
  items.forEach((line, i) => {
    parts.push(buildManifestoCard(line, data.accentColor, `items[${i}]`));
  });
  parts.push(`</div>`);
  parts.push(renderOptionalCallout(data.callout));
  return parts.join("\n");
};
