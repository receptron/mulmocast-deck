import type { SlideTheme, SlideThemeColors, AccentColorKey, SlideLayout, ContentBlock, CalloutBar } from "./schema.js";

/** Escape HTML special characters */
export const escapeHtml = (s: string): string => {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

/** Escape HTML and convert newlines to <br> */
export const nl2br = (s: string): string => {
  return escapeHtml(s).replace(/\n/g, "<br>");
};

/** Valid accent color keys for inline markup */
const inlineColorKeys = new Set(["primary", "accent", "success", "warning", "danger", "info", "highlight"]);

/**
 * Render inline markup: escape HTML first, then parse **bold**, *emphasis*, and {color:text}.
 * Also converts newlines to <br>.
 * Safe: escapeHtml runs before any markup parsing, so XSS is impossible.
 *
 * **bold**     → <strong>...</strong>       (kept as-is for back-compat)
 * *emphasis*   → <em>...</em>               (rendered in warning color via CSS; mimics reveal.js amber <em>)
 * {color:text} → <span class="text-d-color">...</span>
 *
 * Bold is parsed first; the single-asterisk pass only matches what's left, so "**x**" doesn't double-fire.
 */
export const renderInlineMarkup = (s: string): string => {
  let result = escapeHtml(s);
  // Bold MUST run before emphasis so **x** doesn't get eaten by the single-* pass.
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Single-* emphasis. The negative-lookbehind/lookahead keeps it from biting into surviving "**" inside <strong>.
  result = result.replace(/(?<![*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\w)/g, '<em class="text-d-warning not-italic font-bold">$1</em>');
  // {color:text} → <span class="text-d-color">text</span>
  result = result.replace(/\{([a-z]+):(.+?)\}/g, (_match, color: string, text: string) => {
    if (inlineColorKeys.has(color)) {
      return `<span class="text-${c(color)}">${text}</span>`;
    }
    return `{${color}:${text}}`;
  });
  // newlines to <br>
  result = result.replace(/\n/g, "<br>");
  return result;
};

/** Sanitize a value for safe use in CSS class names (alphanumeric + hyphens only) */
const sanitizeCssClass = (s: string): string => {
  return s.replace(/[^a-zA-Z0-9-]/g, "");
};

/** Sanitize a hex color value (hex digits only) */
export const sanitizeHex = (s: string): string => {
  return s.replace(/[^0-9A-Fa-f]/g, "");
};

/** Accent color key → Tailwind class segment: "primary" → "d-primary" */
export const c = (key: string): string => {
  return `d-${sanitizeCssClass(key)}`;
};

// ═══════════════════════════════════════════════════════════
// Shared micro-helpers for HTML generation
// ═══════════════════════════════════════════════════════════

/** Default accent color used when none is specified */
const DEFAULT_ACCENT = "primary";

/** Resolve accent color key with "primary" as fallback */
export const resolveAccent = (color: string | undefined): string => color || DEFAULT_ACCENT;

/** Resolve item-level color with slide-level fallback then "primary" */
export const resolveItemColor = (itemColor: string | undefined, slideAccent: string | undefined): string => itemColor || slideAccent || DEFAULT_ACCENT;

/** Render a horizontal accent bar (3px full-width). Pass extraClass for width/margin variants. */
export const accentBar = (colorKey: string, extraClass?: string): string => `<div class="h-[3px] bg-${c(colorKey)} shrink-0 ${extraClass || ""}"></div>`;

/** Render an optional block title (chart, mermaid, table) */
export const blockTitle = (title: string | undefined): string =>
  title ? `<p class="text-sm font-bold text-d-text font-body mb-2">${renderInlineMarkup(title)}</p>` : "";

/** Resolve change indicator color: "success" for positive (+), "danger" for negative */
export const resolveChangeColor = (change: string): string => (/\+/.test(change) ? "success" : "danger");

/** Render the optional callout bar at the bottom of a slide, or empty string */
export const renderOptionalCallout = (callout: CalloutBar | undefined): string => {
  if (!callout) return "";
  return `<div class="mt-auto pb-4">${renderCalloutBar(callout)}</div>`;
};

type TailwindColorKey = "bg" | "card" | "alt" | "text" | "muted" | "dim" | AccentColorKey;

const colorKeyMap: { [K in keyof SlideThemeColors]: TailwindColorKey } = {
  bg: "bg",
  bgCard: "card",
  bgCardAlt: "alt",
  text: "text",
  textMuted: "muted",
  textDim: "dim",
  primary: "primary",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  highlight: "highlight",
};

/** Build the Tailwind config JSON string for theme colors and fonts */
export const buildTailwindConfig = (theme: SlideTheme): string => {
  const colorMap: { [K in TailwindColorKey]?: string } = {};
  Object.entries(theme.colors).forEach(([k, v]) => {
    const mapped = colorKeyMap[k as keyof SlideThemeColors];
    if (mapped) {
      colorMap[mapped] = `#${v}`;
    }
  });
  const fontFamily: Record<string, string[]> = {
    title: [theme.fonts.title, "serif"],
    body: [theme.fonts.body, "Arial", "sans-serif"],
    mono: [theme.fonts.mono, "monospace"],
  };
  if (theme.fonts.accent) {
    fontFamily.accent = [theme.fonts.accent, "ui-sans-serif", "system-ui", "sans-serif"];
  }
  return JSON.stringify({
    theme: {
      extend: {
        colors: { d: colorMap },
        fontFamily,
      },
    },
  });
};

/**
 * Validate a user-supplied CSS background value before injecting it into an HTML attribute or `<style>` block.
 * Accepts gradient / color syntax; rejects anything that could break out of the attribute context, inject script,
 * or pull external resources. Returns true only when the string is safe to embed verbatim.
 */
export const isSafeCssBackground = (s: string): boolean => {
  if (!s || typeof s !== "string" || s.length > 2000) return false;
  if (/[<>"'`{};:\\\r\n]/.test(s)) return false;
  if (/(javascript|vbscript|data\s+|expression\s*\(|behavior|@import|url\s*\(|attr\s*\(|content\s*\()/i.test(s)) return false;
  return true;
};

/** Render a numbered circle badge */
export const numBadge = (num: number, colorKey: string): string => {
  return `<div class="w-10 h-10 rounded-full bg-${c(colorKey)} flex items-center justify-center shrink-0">
  <span class="text-white font-bold text-sm">${num}</span>
</div>`;
};

/** Render an icon in a square container */
export const iconSquare = (icon: string, colorKey: string): string => {
  return `<div class="w-16 h-16 bg-d-alt flex items-center justify-center rounded">
  <span class="text-2xl font-mono font-bold text-${c(colorKey)}">${escapeHtml(icon)}</span>
</div>`;
};

/** Render a card wrapper with accent top bar */
export const cardWrap = (accentColor: string, innerHtml: string, extraClass?: string): string => {
  return `<div class="bg-d-card rounded-lg shadow-lg overflow-hidden flex flex-col min-h-0 ${sanitizeCssClass(extraClass || "")}">
  ${accentBar(accentColor)}
  <div class="p-5 flex flex-col flex-1 min-h-0 overflow-hidden">
${innerHtml}
  </div>
</div>`;
};

/** Render a callout bar at the bottom of a slide */
export const renderCalloutBar = (obj: { text: string; label?: string; color?: string; align?: string; leftBar?: boolean }): string => {
  const color = obj.color || "warning";
  const leftBar = obj.leftBar ? `<div class="w-1 bg-${c(color)} shrink-0"></div>` : "";
  const align = obj.align === "center" ? "text-center" : "";
  const inner = obj.label
    ? `<span class="font-bold text-${c(color)}">${renderInlineMarkup(obj.label)}:</span> <span class="text-d-muted">${renderInlineMarkup(obj.text)}</span>`
    : `<span class="text-d-muted">${renderInlineMarkup(obj.text)}</span>`;
  return `<div class="mx-12 bg-d-card rounded flex overflow-hidden ${align}">
  ${leftBar}
  <div class="px-4 py-3 text-sm font-body flex-1">${inner}</div>
</div>`;
};

/**
 * Render an eyebrow pill (small uppercase letter-spaced category label).
 * Renders nothing when `eyebrow` is undefined, so callers can pass through unconditionally.
 */
export const renderEyebrow = (eyebrow: { label: string; color?: string } | undefined, defaultColor?: string): string => {
  if (!eyebrow) return "";
  const color = c(eyebrow.color ?? defaultColor ?? "primary");
  return `<span class="inline-flex items-center gap-2 font-accent font-extrabold uppercase tracking-[0.16em] text-[12px] px-3 py-1 rounded-full border border-d-textDim/30 bg-${color}/10 text-${color}">${renderInlineMarkup(eyebrow.label)}</span>`;
};

/** Render a chip-row (small bordered pill badges, e.g. tags below a title). Empty / undefined input renders nothing. */
export const renderChipRow = (chips: string[] | undefined): string => {
  if (!chips || chips.length === 0) return "";
  const items = chips
    .map((label) => `<span class="text-sm px-3 py-1.5 rounded-full border border-d-textDim/30 bg-d-card/40 text-d-text">${renderInlineMarkup(label)}</span>`)
    .join("");
  return `<div class="flex gap-2 flex-wrap mt-4">${items}</div>`;
};

/** Render an accent-colored typographic prefix (e.g. "01") to be placed before a card / stat title. */
export const renderNumLabel = (label: string | undefined, colorKey?: string): string => {
  if (!label) return "";
  const color = c(colorKey ?? "primary");
  return `<span class="font-accent font-extrabold text-${color} mr-2">${renderInlineMarkup(label)}</span>`;
};

/** h2 font-size by titleSize variant — kept in one place so it's easy to keep proportional to subtitle / body. */
const TITLE_SIZE_CLS: Record<"small" | "default" | "large" | "hero", string> = {
  small: "text-[34px]",
  default: "text-[42px]",
  large: "text-[52px]",
  hero: "text-[64px]",
};

/** Render header text elements (stepLabel + title + subtitle) without wrapping div */
export const renderHeaderText = (data: {
  accentColor?: string;
  stepLabel?: string;
  title: string;
  subtitle?: string;
  eyebrow?: { label: string; color?: string };
  titleSize?: "small" | "default" | "large" | "hero";
}): string => {
  const accent = resolveAccent(data.accentColor);
  const lines: string[] = [];
  const eyebrowHtml = renderEyebrow(data.eyebrow, accent);
  if (eyebrowHtml) lines.push(`<div class="mb-2">${eyebrowHtml}</div>`);
  if (data.stepLabel) {
    lines.push(`<p class="text-sm font-bold text-${c(accent)} font-body">${renderInlineMarkup(data.stepLabel)}</p>`);
  }
  const titleCls = TITLE_SIZE_CLS[data.titleSize ?? "default"];
  lines.push(`<h2 class="${titleCls} leading-tight font-title font-bold text-d-text">${renderInlineMarkup(data.title)}</h2>`);
  if (data.subtitle) {
    lines.push(`<p class="text-[15px] text-d-dim mt-2 font-body">${renderInlineMarkup(data.subtitle)}</p>`);
  }
  return lines.join("\n");
};

/** Render the common slide header (accent bar + title + subtitle, plus optional eyebrow pill) */
export const slideHeader = (data: {
  accentColor?: string;
  stepLabel?: string;
  title: string;
  subtitle?: string;
  eyebrow?: { label: string; color?: string };
  titleSize?: "small" | "default" | "large" | "hero";
}): string => {
  const accent = resolveAccent(data.accentColor);
  return [accentBar(accent), `<div class="px-12 pt-5 shrink-0">`, renderHeaderText(data), `</div>`].join("\n");
};

/** Render accent bar + vertically-centered wrapper with header text (used by stats, timeline) */
export const centeredSlideHeader = (data: {
  accentColor?: string;
  stepLabel?: string;
  title: string;
  subtitle?: string;
  eyebrow?: { label: string; color?: string };
  titleSize?: "small" | "default" | "large" | "hero";
}): string => {
  const accent = resolveAccent(data.accentColor);
  return [accentBar(accent), `<div class="flex-1 flex flex-col justify-center px-12 min-h-0">`, renderHeaderText(data)].join("\n");
};

// ═══════════════════════════════════════════════════════════
// Counter-based ID generation (unique within a single slide)
// ═══════════════════════════════════════════════════════════

let slideIdCounter = 0;

/** Generate a unique ID with the given prefix (e.g. "chart-0", "mermaid-1") */
export const generateSlideId = (prefix: string): string => `${prefix}-${slideIdCounter++}`;

/** Reset the ID counter (for testing) */
export const resetSlideIdCounter = (): void => {
  slideIdCounter = 0;
};

// ═══════════════════════════════════════════════════════════
// Content block type detection
// ═══════════════════════════════════════════════════════════

/** Chart.js plugin CDN URLs keyed by chart type */
const CHART_PLUGIN_CDNS: Record<string, string> = {
  sankey: "https://cdn.jsdelivr.net/npm/chartjs-chart-sankey",
  treemap: "https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@3",
};

type BlockTypeFlags = { hasChart: boolean; hasMermaid: boolean; chartPlugins: string[] };

/** Collect all content block arrays from a slide layout */
const collectContentArrays = (slide: SlideLayout): ContentBlock[][] => {
  const arrays: ContentBlock[][] = [];
  const pushIfPresent = (content: ContentBlock[] | undefined) => {
    if (content) arrays.push(content);
  };
  switch (slide.layout) {
    case "columns":
      slide.columns.forEach((col) => pushIfPresent(col.content));
      break;
    case "comparison":
      pushIfPresent(slide.left.content);
      pushIfPresent(slide.right.content);
      break;
    case "grid":
      slide.items.forEach((item) => pushIfPresent(item.content));
      break;
    case "split":
      pushIfPresent(slide.left?.content);
      pushIfPresent(slide.right?.content);
      break;
    case "matrix":
      slide.cells.forEach((cell) => pushIfPresent(cell.content));
      break;
  }
  return arrays;
};

/** Collect chart type from a chart block */
const collectChartPlugin = (block: ContentBlock, plugins: Set<string>): void => {
  if (block.type === "chart") {
    const chartType = block.chartData?.type as string | undefined;
    if (chartType && CHART_PLUGIN_CDNS[chartType]) {
      plugins.add(CHART_PLUGIN_CDNS[chartType]);
    }
  }
};

/** Detect whether chart or mermaid content blocks exist in a slide */
export const detectBlockTypes = (slide: SlideLayout): BlockTypeFlags => {
  const arrays = collectContentArrays(slide);
  let hasChart = false;
  let hasMermaid = false;
  const plugins = new Set<string>();
  arrays.forEach((blocks) => {
    blocks.forEach((block) => {
      if (block.type === "chart") hasChart = true;
      if (block.type === "mermaid") hasMermaid = true;
      collectChartPlugin(block, plugins);
      if (block.type === "section" && block.content) {
        block.content.forEach((inner) => {
          if (inner.type === "chart") hasChart = true;
          if (inner.type === "mermaid") hasMermaid = true;
          collectChartPlugin(inner, plugins);
        });
      }
    });
  });
  return { hasChart, hasMermaid, chartPlugins: [...plugins] };
};
