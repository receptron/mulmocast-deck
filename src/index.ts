// Public API for @mulmocast/deck
// Self-contained deck DSL: SlideLayout JSON → Tailwind-based HTML string.

export { generateSlideHTML } from "./render.js";
export type { ResolvedBranding } from "./render.js";
export { renderSlideContent } from "./layouts/index.js";
export { renderContentBlock, renderContentBlocks } from "./blocks.js";
export { escapeHtml, resetSlideIdCounter, renderInlineMarkup } from "./utils.js";

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
  AccentColorKey,
  // ─── content blocks ───
  ContentBlock,
  TextBlock,
  BulletsBlock,
  BulletItem,
  CodeBlock,
  CalloutBlock,
  MetricBlock,
  DividerBlock,
  ImageBlock,
  ImageRefBlock,
  ChartBlock,
  MermaidBlock,
  SectionBlock,
  TableBlock,
  TagBlock,
  TableCellValue,
  // ─── layout slides ───
  TitleSlide,
  ColumnsSlide,
  ComparisonSlide,
  ComparisonPanel,
  GridSlide,
  GridItem,
  BigQuoteSlide,
  StatsSlide,
  StatItem,
  TimelineSlide,
  TimelineItem,
  SplitSlide,
  SplitPanel,
  MatrixSlide,
  MatrixCell,
  TableSlide,
  FunnelSlide,
  FunnelStage,
  WaterfallSlide,
  WaterfallItem,
  ManifestoSlide,
  ManifestoLine,
  // ─── shared bits ───
  Card,
  CalloutBar,
  SlideStyle,
  SlideBrandingLogo,
  SlideBranding,
  // ─── enums / variants ───
  BulletIcon,
  TextSize,
  SlideDensity,
  SlideTitleSize,
  SlideSubtitleSize,
  SlideCardStyle,
} from "./schema.js";
