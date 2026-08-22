import type { SlideTheme, SlideLayout, SlideIntro } from "./schema.js";
import { escapeHtml, buildTailwindConfig, sanitizeHex, detectBlockTypes, isSafeCssBackground } from "./utils.js";
import { renderSlideContent } from "./layouts/index.js";

/** Keyframes + animation rule for each intro preset. Pure CSS — no JS, no transform hacks. */
const INTRO_KEYFRAMES: Record<SlideIntro, string> = {
  fade: "@keyframes mulmoIntroFade{from{opacity:0}to{opacity:1}}",
  "fade-up": "@keyframes mulmoIntroFadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}",
  "fade-down": "@keyframes mulmoIntroFadeDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}",
  "slide-left": "@keyframes mulmoIntroSlideLeft{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}",
  "slide-right": "@keyframes mulmoIntroSlideRight{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}",
  "zoom-in": "@keyframes mulmoIntroZoomIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}",
};

const INTRO_NAMES: Record<SlideIntro, string> = {
  fade: "mulmoIntroFade",
  "fade-up": "mulmoIntroFadeUp",
  "fade-down": "mulmoIntroFadeDown",
  "slide-left": "mulmoIntroSlideLeft",
  "slide-right": "mulmoIntroSlideRight",
  "zoom-in": "mulmoIntroZoomIn",
};

/** Cap on how many staggered children get a generated nth-child rule — covers every realistic list size. */
const STAGGER_MAX_ITEMS = 40;

/**
 * Build the `<style>` block for a slide's intro animation.
 * Whole-slide form: a single rule on `.mulmo-intro` runs the chosen preset once.
 * Staggered form: items inside `.mulmo-stagger` (anything with `data-mulmo-item-path`) run the
 * same preset sequentially via `:nth-child(n)` delays; the slide root itself is static.
 */
const buildIntroCss = (intro: SlideIntro, staggerMs: number | undefined, scope: string): string => {
  const kf = INTRO_KEYFRAMES[intro];
  const name = INTRO_NAMES[intro];
  const useStagger = staggerMs !== undefined && staggerMs > 0;
  if (!useStagger) {
    return `${kf} ${scope}.mulmo-intro{animation:${name} .5s cubic-bezier(.22,.61,.36,1) both}`;
  }
  const delays: string[] = [];
  for (let i = 0; i < STAGGER_MAX_ITEMS; i++) {
    // `:nth-child(n)` is 1-indexed; index i maps to delay i * staggerMs.
    delays.push(`${scope}.mulmo-stagger [data-mulmo-item-path]:nth-child(${i + 1}){animation-delay:${i * staggerMs}ms}`);
  }
  return `${kf} ${scope}.mulmo-stagger [data-mulmo-item-path]{animation:${name} .5s cubic-bezier(.22,.61,.36,1) both;animation-delay:0ms}${delays.join("")}`;
};

/** Gradient-filled slide titles, painted via background-clip on the `<h1>`. */
const buildTitleGradientCss = (theme: SlideTheme, scope: string): string => {
  if (!theme.titleGradient || !isSafeCssBackground(theme.titleGradient)) return "";
  const prefix = scope ? `${scope} ` : "";
  return `${prefix}h1.font-title.font-bold{background:${theme.titleGradient};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;}`;
};

/**
 * Compact density: shrink body text and pad spacing — approximates reveal.js' autofit.
 * `!important` is deliberate: these have to win over the per-utility Tailwind rules
 * the CDN injects at runtime.
 */
const buildDensityCss = (slide: SlideLayout, scope: string): string => {
  if (slide.density !== "compact") return "";
  const s = `${scope}.density-compact`;
  return `${s} p,${s} li{font-size:14px!important;line-height:1.5}${s} h2{font-size:32px!important}${s} h3{font-size:17px!important}${s} .px-12{padding-left:28px!important;padding-right:28px!important}${s} .px-16{padding-left:36px!important;padding-right:36px!important}${s} .pt-5{padding-top:10px!important}${s} .mt-10{margin-top:16px!important}${s} .mt-5{margin-top:10px!important}${s} .gap-4{gap:10px!important}${s} .gap-6{gap:14px!important}${s} .space-y-2>*+*{margin-top:4px!important}${s} .space-y-4>*+*{margin-top:8px!important}${s} .p-5{padding:14px!important}${s} .p-10{padding:20px!important}`;
};

/** Glass cards: swap the solid bg-d-card for a subtle gradient + border. */
const buildCardGlassCss = (theme: SlideTheme, scope: string): string => {
  if (theme.cardStyle !== "glass") return "";
  const s = `${scope}.card-glass`;
  return `${s} .bg-d-card{background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))!important;border:1px solid rgba(120,150,220,.22)!important;box-shadow:none!important}${s} .rounded-lg{border-radius:16px!important}`;
};

/**
 * The four optional rule sets, in document order, with empties dropped.
 * `scope` confines every rule to one slide's subtree; pass "" for a standalone document.
 */
export const buildSlideRuleSets = (theme: SlideTheme, slide: SlideLayout, scope: string): string[] =>
  [
    buildTitleGradientCss(theme, scope),
    buildDensityCss(slide, scope),
    buildCardGlassCss(theme, scope),
    slide.intro ? buildIntroCss(slide.intro, slide.staggerMs, scope) : "",
  ].filter(Boolean);

/**
 * Wrap raw CSS in a `<style>` block for a standalone document, or emit nothing.
 * The leading newline puts the block on its own line; an empty rule set adds no blank line.
 */
const styleTag = (css: string): string => (css ? `\n<style>${css}</style>` : "");

/** Pre-resolved branding data (all sources converted to data URLs) */
export type ResolvedBranding = {
  logo?: { dataUrl: string; position: string; width: number };
  backgroundImage?: { dataUrl: string; size: string; opacity: number; bgOpacity?: number };
};

/** Determine if a hex color is dark (luminance < 128) */
export const isDarkBg = (hex: string): boolean => {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
};

/** Build CDN script tags for chart/mermaid when needed */
/**
 * Draws every chart in the document from the `data-mulmo-chart` attribute the block renderer
 * leaves on each canvas. One driver for the page, not one per chart: a block that emitted
 * its own would put a `<script>` inside `generateSlideFragment`'s markup too, where it
 * cannot run and cannot be removed safely — the config it carries is arbitrary user data,
 * so a `</script>` inside it ends the block early.
 *
 * It waits for `DOMContentLoaded`: this tag sits in `<head>`, above the body it has to find
 * canvases in. The Chart.js CDN tag above it is synchronous, so `Chart` is already defined.
 */
const chartDriverScript = `<script>document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('canvas[data-mulmo-chart]').forEach(function(ctx){
    const d=JSON.parse(ctx.dataset.mulmoChart);
    if(!d.options)d.options={};
    d.options.animation=false;
    d.options.responsive=true;
    d.options.maintainAspectRatio=false;
    new Chart(ctx,d);
    requestAnimationFrame(function(){requestAnimationFrame(function(){ctx.dataset.chartReady="true"})});
  });
})</script>`;

const buildCdnScripts = (theme: SlideTheme, slide: SlideLayout): string => {
  const { hasChart, hasMermaid, chartPlugins } = detectBlockTypes(slide);
  const scripts: string[] = [];
  if (hasChart) {
    scripts.push('<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');
    chartPlugins.forEach((cdn) => {
      scripts.push(`<script src="${cdn}"></script>`);
    });
    scripts.push(chartDriverScript);
  }
  if (hasMermaid) {
    const mermaidTheme = isDarkBg(theme.colors.bg) ? "dark" : "default";
    scripts.push(`<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,theme:'${mermaidTheme}'})</script>`);
  }
  return scripts.join("\n");
};

/** Map branding logo position to Tailwind CSS classes */
const logoPositionClasses: Record<string, string> = {
  "top-left": "top-5 left-6",
  "top-right": "top-5 right-6",
  "bottom-left": "bottom-5 left-6",
  "bottom-right": "bottom-5 right-6",
};

/**
 * Render branding background layers.
 * - Without bgOpacity: image overlaid on slide bg at given opacity
 * - With bgOpacity: image at full opacity, then slide bg color as semi-transparent overlay
 */
const renderBrandingBackground = (branding: ResolvedBranding, bgHex: string): string => {
  if (!branding.backgroundImage) return "";
  const { dataUrl, size, opacity, bgOpacity } = branding.backgroundImage;
  const bgSize = size === "fill" ? "100% 100%" : size;
  if (bgOpacity !== undefined) {
    const parts: string[] = [];
    parts.push(
      `<div class="absolute inset-0 z-0" style="background-image:url('${dataUrl}');background-size:${bgSize};background-position:center;background-repeat:no-repeat;opacity:${opacity}"></div>`,
    );
    parts.push(`<div class="absolute inset-0 z-0" style="background-color:#${bgHex};opacity:${bgOpacity}"></div>`);
    return parts.join("\n");
  }
  return `<div class="absolute inset-0 z-0" style="background-image:url('${dataUrl}');background-size:${bgSize};background-position:center;background-repeat:no-repeat;opacity:${opacity}"></div>`;
};

/** Render branding logo element */
const renderBrandingLogo = (branding: ResolvedBranding): string => {
  if (!branding.logo) return "";
  const { dataUrl, position, width } = branding.logo;
  const posClasses = logoPositionClasses[position] ?? logoPositionClasses["top-right"];
  return `<img class="absolute ${posClasses} z-10" src="${dataUrl}" width="${width}" alt="" style="pointer-events:none">`;
};

/**
 * Everything a slide needs, without deciding whether it becomes a document or a fragment.
 * `scopeClass` goes on the slide's root element and its rules are written against it,
 * so several slides can share a page. Empty means global rules, for a standalone document.
 */
export const buildSlide = (
  theme: SlideTheme,
  slide: SlideLayout,
  scopeClass: string,
  reference?: string,
  branding?: ResolvedBranding,
): { body: string; ruleSets: string[]; twConfig: string; cdnScripts: string } => {
  const content = renderSlideContent(slide);
  const twConfig = buildTailwindConfig(theme);
  const cdnScripts = buildCdnScripts(theme, slide);

  const slideStyle = slide.style;
  const hasBgOpacity = branding?.backgroundImage?.bgOpacity !== undefined;

  // Background resolution priority (any new field is optional; when absent the output is byte-identical to pre-extension behavior):
  //   slide.style.bgGradient > theme.bgGradient > slide.style.bgColor > theme.colors.bg (via `bg-d-bg` class).
  // hasBgOpacity (branding bg image with custom opacity) still suppresses background styling, as before.
  let bgCls = "";
  let inlineStyle = "";
  if (!hasBgOpacity) {
    const slideBgGradient = slideStyle?.bgGradient && isSafeCssBackground(slideStyle.bgGradient) ? slideStyle.bgGradient : undefined;
    const themeBgGradient = !slideBgGradient && theme.bgGradient && isSafeCssBackground(theme.bgGradient) ? theme.bgGradient : undefined;
    const bgGradient = slideBgGradient ?? themeBgGradient;
    if (bgGradient) {
      inlineStyle = ` style="background:${bgGradient}"`;
    } else if (slideStyle?.bgColor) {
      inlineStyle = ` style="background-color:#${sanitizeHex(slideStyle.bgColor)}"`;
    } else {
      bgCls = "bg-d-bg";
    }
  }

  // A standalone document holds one slide, so it passes no scope and the rules stay global.
  const ruleSets = buildSlideRuleSets(theme, slide, scopeClass ? `.${scopeClass}` : "");
  const densityCls = slide.density === "compact" ? " density-compact" : "";
  const cardStyleCls = theme.cardStyle === "glass" ? " card-glass" : "";

  // Intro animation: opt-in CSS entrance preset. Without `staggerMs`, the whole slide animates as
  // one block via `.mulmo-intro` on the slide root. With `staggerMs`, items in list-based layouts
  // (anything with [data-mulmo-item-path]) animate sequentially via `.mulmo-stagger` + nth-child
  // delays; the slide root itself stays static so the two animations don't compound.
  const useStagger = slide.intro && slide.staggerMs !== undefined && slide.staggerMs > 0;
  const introCls = !slide.intro ? "" : useStagger ? " mulmo-stagger" : " mulmo-intro";

  const footer = slideStyle?.footer ? `<p class="absolute bottom-2 right-4 text-xs text-d-dim font-body">${escapeHtml(slideStyle.footer)}</p>` : "";
  const referenceHtml = reference
    ? `<div class="mt-auto px-4 pb-2"><p class="text-sm text-d-muted font-body opacity-80">${escapeHtml(reference)}</p></div>`
    : "";

  const bgHex = sanitizeHex(slideStyle?.bgColor ?? theme.colors.bg);
  const brandingBg = branding ? renderBrandingBackground(branding, bgHex) : "";
  const brandingLogo = branding ? renderBrandingLogo(branding) : "";

  const body = `<div class="${scopeClass ? `${scopeClass} ` : ""}relative overflow-hidden ${bgCls}${densityCls}${cardStyleCls}${introCls} w-full h-full flex flex-col"${inlineStyle}>
${brandingBg}
<div class="relative z-[1] flex flex-col flex-1">
${content}
${referenceHtml}
${footer}
</div>
${brandingLogo}
</div>`;

  return { body, ruleSets, twConfig, cdnScripts };
};

/** Generate a complete HTML document for a single slide */
export const generateSlideHTML = (theme: SlideTheme, slide: SlideLayout, reference?: string, branding?: ResolvedBranding): string => {
  const { body, ruleSets, twConfig, cdnScripts } = buildSlide(theme, slide, "", reference, branding);
  const ruleSetStyles = ruleSets.map(styleTag).join("");
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = ${twConfig}</script>
${cdnScripts}
<style>
  html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; }
</style>${ruleSetStyles}
</head>
<body class="h-full">
${body}
</body>
</html>`;
};
