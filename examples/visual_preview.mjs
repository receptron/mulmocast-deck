// Visual preview generator for Phase 1 theme extensions.
// Run: `yarn build && node examples/visual_preview.mjs`
// Output: examples/out/*.html — open in a browser to inspect.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateSlideHTML } from "../lib/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "out");
fs.mkdirSync(outDir, { recursive: true });

const baseColors = {
  bg: "0A0F24",
  bgCard: "111A3A",
  bgCardAlt: "16224D",
  text: "EEF2FF",
  textMuted: "9FB0D8",
  textDim: "6F7FA0",
  primary: "38BDF8",
  accent: "818CF8",
  success: "34D399",
  warning: "FBBF24",
  danger: "FB7185",
  info: "38BDF8",
  highlight: "F0ABFC",
};

const lightColors = {
  bg: "FFFBEB",
  bgCard: "FFFFFF",
  bgCardAlt: "FEF3C7",
  text: "1C1917",
  textMuted: "57534E",
  textDim: "A8A29E",
  primary: "EA580C",
  accent: "D946EF",
  success: "16A34A",
  warning: "CA8A04",
  danger: "DC2626",
  info: "0284C7",
  highlight: "E11D48",
};

const themes = {
  // Existing-style theme (no new fields) — sanity check that nothing regresses
  classic_light: {
    colors: lightColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
  },
  // New: dark navy with multi-layer gradient bg, title-gradient text, Outfit accent font
  dark_studio: {
    colors: baseColors,
    fonts: {
      title: "'Noto Sans JP', system-ui, sans-serif",
      body: "'Noto Sans JP', system-ui, sans-serif",
      mono: "Consolas",
      accent: "Outfit",
    },
    bgGradient:
      "radial-gradient(1200px 700px at 12% -10%, rgba(56,189,248,.16), transparent 60%), radial-gradient(1000px 600px at 100% 0%, rgba(129,140,248,.16), transparent 55%), linear-gradient(160deg, #0A0F24, #111A3A 55%, #16224D)",
    titleGradient: "linear-gradient(100deg, #FFFFFF, #38BDF8 60%, #818CF8)",
  },
  // bg gradient only (no title gradient) — verify partial adoption works
  dark_studio_bg_only: {
    colors: baseColors,
    fonts: { title: "'Noto Sans JP', system-ui, sans-serif", body: "'Noto Sans JP', system-ui, sans-serif", mono: "Consolas" },
    bgGradient: "linear-gradient(160deg, #0A0F24, #16224D)",
  },
};

const slides = [
  {
    layout: "title",
    title: "Phase 1 Preview",
    subtitle: "Theme gradients + accent font",
  },
  {
    layout: "stats",
    title: "Quarterly Highlights",
    subtitle: "FY2026 Q1",
    stats: [
      { value: "+42%", label: "Revenue YoY", color: "success" },
      { value: "1.8M", label: "Active Users", color: "primary" },
      { value: "4.6", label: "Avg NPS", color: "info" },
      { value: "98%", label: "Uptime", color: "accent" },
    ],
  },
  {
    layout: "comparison",
    title: "Before vs After",
    left: { title: "Before", accentColor: "danger", content: [{ type: "bullets", items: ["Slow CI", "Manual deploys", "No alerts"] }] },
    right: { title: "After", accentColor: "success", content: [{ type: "bullets", items: ["Fast CI", "One-click deploys", "Live alerts"] }] },
  },
  {
    layout: "bigQuote",
    quote: "100の議論より、1つ作って試す。",
    author: "deploy or die.",
  },
];

let count = 0;
for (const [themeName, theme] of Object.entries(themes)) {
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const html = generateSlideHTML(theme, slide);
    const filename = `${themeName}__${String(i + 1).padStart(2, "0")}_${slide.layout}.html`;
    fs.writeFileSync(path.join(outDir, filename), html);
    count++;
  }
}

console.log(`Wrote ${count} HTML files to ${outDir}`);
console.log(`Open in a browser, e.g.:  open ${outDir}/dark_studio__01_title.html`);
