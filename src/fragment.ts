import type { SlideTheme, SlideLayout } from "./schema.js";
import { buildSlide, isDarkBg, type ResolvedBranding } from "./render.js";
import { buildThemeVars } from "./theme_css.js";
import { detectBlockTypes, generateSlideId } from "./utils.js";

/** External runtimes a fragment needs the host to have loaded. */
export type SlideRuntime = "chart" | "mermaid";

export type SlideFragment = {
  /** Body markup only — no `<html>`, `<head>`, `<style>` or `<script>`. */
  html: string;
  /** Every rule the slide needs, already confined to `scopeClass`. */
  css: string;
  /** The class on the fragment's root element. Its CSS is written against it. */
  scopeClass: string;
  /** Runtimes the host must load once for the page, not once per slide. */
  requires: SlideRuntime[];
  /** Extra Chart.js plugin CDNs this slide's chart types need. */
  chartPlugins: string[];
  /** Which mermaid theme suits this slide's background. Absent unless mermaid is required. */
  mermaidTheme?: "dark" | "default";
};

export type SlideFragmentOptions = {
  reference?: string;
  branding?: ResolvedBranding;
  /**
   * Overrides the generated scope class. Pass one derived from your own data (a beat
   * index, a slide id) when the fragment has to survive a re-render with the same class.
   */
  scopeClass?: string;
};

/**
 * A fragment must not carry `<script>`. Injected markup does not execute its scripts,
 * and a sanitiser drops them — so what ships is dead weight that reads like working
 * code. The only script the layouts emit is the chart driver, whose config also rides
 * on the canvas as `data-mulmo-chart` for the host to hydrate from.
 */
const stripScripts = (html: string): string => html.replace(/\n?[ \t]*<script\b[^>]*>[\s\S]*?<\/script>/g, "");

/**
 * Render a slide as markup that drops into a `<div>`, instead of the standalone document
 * `generateSlideHTML` produces.
 *
 * Nothing shared between slides is emitted here: no Tailwind, no Chart.js or mermaid
 * `<script>`, no `html, body` reset. Those belong to the host, once for the page —
 * `requires` says which of them this slide actually needs. Emitting them per slide is
 * what makes a list of slides load the same CDN N times.
 *
 * The host is responsible for: including `slideUtilityCss` once, loading anything in
 * `requires`, driving any `[data-mulmo-chart]` canvas and `.mermaid` element it finds,
 * and giving the container a size — the fragment is `w-full h-full`, and the
 * layouts are designed at 1280px wide.
 */
export const generateSlideFragment = (theme: SlideTheme, slide: SlideLayout, options: SlideFragmentOptions = {}): SlideFragment => {
  // Allocated before the body so the scope class exists to write rules against. It comes
  // off the same counter as chart / mermaid ids, so `resetSlideIdCounter()` makes the
  // whole fragment reproducible.
  const scopeClass = options.scopeClass ?? generateSlideId("mulmo-slide");
  const { body, ruleSets } = buildSlide(theme, slide, scopeClass, options.reference, options.branding);
  const { hasChart, hasMermaid, chartPlugins } = detectBlockTypes(slide);

  // Theme first: the custom properties have to be in scope for the rules that read them.
  const css = [`.${scopeClass}{${buildThemeVars(theme)}}`, ...ruleSets].join("");

  return {
    html: stripScripts(body),
    css,
    scopeClass,
    requires: [...(hasChart ? (["chart"] as const) : []), ...(hasMermaid ? (["mermaid"] as const) : [])],
    chartPlugins,
    ...(hasMermaid ? { mermaidTheme: isDarkBg(theme.colors.bg) ? ("dark" as const) : ("default" as const) } : {}),
  };
};
