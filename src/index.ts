// Public API for @mulmocast/slide
// Self-contained slide DSL: SlideLayout JSON → Tailwind-based HTML string.

export { generateSlideHTML } from "./render.js";
export type { ResolvedBranding } from "./render.js";
export { renderSlideContent } from "./layouts/index.js";
export { renderContentBlock, renderContentBlocks } from "./blocks.js";
export { escapeHtml } from "./utils.js";

// Schemas
export {
  mulmoSlideMediaSchema,
  slideLayoutSchema,
  slideThemeSchema,
  contentBlockSchema,
  imageRefBlockSchema,
  chartBlockSchema,
  mermaidBlockSchema,
  accentColorKeySchema,
  slideBrandingLogoSchema,
  slideBrandingSchema,
} from "./schema.js";

// Types
export type {
  MulmoSlideMedia,
  SlideLayout,
  SlideTheme,
  SlideThemeColors,
  SlideThemeFonts,
  ContentBlock,
  ImageRefBlock,
  ChartBlock,
  MermaidBlock,
  AccentColorKey,
  TitleSlide,
  ColumnsSlide,
  ComparisonSlide,
  GridSlide,
  BigQuoteSlide,
  StatsSlide,
  TimelineSlide,
  SplitSlide,
  MatrixSlide,
  TableSlide,
  FunnelSlide,
  Card,
  CalloutBar,
  SlideStyle,
  SlideBrandingLogo,
  SlideBranding,
} from "./schema.js";
