import type { SlideTheme } from "./schema.js";
import { colorKeyMap, buildFontStacks, sanitizeHex, type TailwindColorKey } from "./utils.js";

/**
 * The `d-*` utilities exist only because `generateSlideHTML` registers them with the
 * Tailwind CDN at runtime (`tailwind.config`). A fragment has no CDN and no config, so
 * the same utilities are shipped as a static stylesheet reading CSS custom properties,
 * and the theme becomes those properties on the slide's own element.
 *
 * The pay-off beyond working in a `<div>`: changing a theme is a variable write, so a
 * host can restyle a rendered slide without regenerating its HTML.
 */

/** Every `d-*` colour segment, derived from colorKeyMap so a new colour cannot be missed. */
const COLOR_SEGMENTS: TailwindColorKey[] = [...new Set(Object.values(colorKeyMap))];

const FONT_SEGMENTS = ["title", "body", "mono", "accent"] as const;

/**
 * Colour utility prefix → the property it sets. `ring` / `ring-offset` write the
 * variables Tailwind's own `ring-*` utilities read, so the host's `ring-2` still draws.
 */
const COLOR_UTILITIES: [prefix: string, property: string][] = [
  ["bg", "background-color"],
  ["text", "color"],
  ["border", "border-color"],
  ["ring", "--tw-ring-color"],
  ["ring-offset", "--tw-ring-offset-color"],
];

/**
 * Alpha variants the layouts actually use. Tailwind derives these on demand; a static
 * sheet has to enumerate them, so the coverage test fails if the source grows one that
 * is not listed here.
 */
const ALPHA_VARIANTS: [prefix: string, segment: TailwindColorKey | "*", percent: number][] = [
  ["bg", "alt", 30],
  ["bg", "card", 40],
  ["border", "dim", 30],
  // renderEyebrow builds `bg-${c(color)}/10`, so the colour is only known at runtime.
  ["bg", "*", 10],
];

const colorRules = (): string[] =>
  COLOR_UTILITIES.flatMap(([prefix, property]) => COLOR_SEGMENTS.map((seg) => `.${prefix}-d-${seg}{${property}:var(--d-${seg})}`));

const alphaRules = (): string[] =>
  ALPHA_VARIANTS.flatMap(([prefix, seg, pct]) => {
    const property = COLOR_UTILITIES.find(([p]) => p === prefix)?.[1];
    if (!property) throw new Error(`alpha variant "${prefix}" has no colour utility`);
    const segments = seg === "*" ? COLOR_SEGMENTS : [seg];
    // The `/` has to be escaped to appear in a selector.
    return segments.map((sg) => `.${prefix}-d-${sg}\\/${pct}{${property}:color-mix(in srgb,var(--d-${sg}) ${pct}%,transparent)}`);
  });

const fontRules = (): string[] => FONT_SEGMENTS.map((seg) => `.font-${seg}{font-family:var(--d-font-${seg})}`);

/**
 * Static stylesheet backing every `d-*` and `font-*` class the deck emits.
 * Theme-independent, so a host renders many slides and loads this once.
 */
export const slideUtilityCss: string = [...colorRules(), ...alphaRules(), ...fontRules()].join("");

/**
 * A theme as CSS custom property declarations, for the slide's own element.
 * `--d-font-accent` is omitted when the theme has no accent font, which leaves
 * `font-family: var(--d-font-accent)` invalid and lets the inherited font win —
 * matching the CDN build, where `font-accent` is simply never registered.
 */
export const buildThemeVars = (theme: SlideTheme): string => {
  const decls: string[] = [];
  Object.entries(theme.colors).forEach(([field, hex]) => {
    const seg = colorKeyMap[field as keyof typeof colorKeyMap];
    if (seg) decls.push(`--d-${seg}:#${sanitizeHex(hex)}`);
  });
  Object.entries(buildFontStacks(theme)).forEach(([seg, stack]) => decls.push(`--d-font-${seg}:${stack.join(",")}`));
  return decls.join(";");
};
