// Visual preview generator for the deck DSL.
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
  classic_light: {
    colors: lightColors,
    fonts: { title: "Georgia", body: "Calibri", mono: "Consolas" },
  },
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
};

const slides = {
  // Phase 1: gradient title + chips row
  title_with_chips: {
    layout: "title",
    eyebrow: { label: "Singularity Society · 4th BootCamp" },
    title: "第4回 BootCamp\nキックオフ",
    subtitle: "半年〜1年、手を動かし続ける旅のはじまり。",
    author: "2026.06.13-14 · 東京 · オフライン",
    chips: ["🚀 deploy or die", "🔁 ドッグフーディング", "⚡ 週1アウトプット", "🤝 相互フィードバック"],
  },
  // Phase 2: numLabel in stats + eyebrow
  stats_with_numbers: {
    layout: "stats",
    eyebrow: { label: "Highlights", color: "primary" },
    title: "Quarterly Snapshot",
    subtitle: "FY2026 Q1",
    stats: [
      { numLabel: "01", value: "+42%", label: "Revenue YoY", color: "success" },
      { numLabel: "02", value: "1.8M", label: "Active Users", color: "primary" },
      { numLabel: "03", value: "4.6", label: "Avg NPS", color: "info" },
      { numLabel: "04", value: "98%", label: "Uptime", color: "accent" },
    ],
  },
  // Phase 2: numLabel in columns
  columns_agenda: {
    layout: "columns",
    eyebrow: { label: "Agenda" },
    title: "今日話すこと",
    columns: [
      { numLabel: "01", title: "原点・なぜ今・行動哲学", content: [{ type: "text", value: "BootCamp が大事にしている姿勢" }] },
      { numLabel: "02", title: "ドッグフーディング & つくり方", content: [{ type: "text", value: "何を、どう作るか" }] },
      { numLabel: "03", title: "4つのコース", content: [{ type: "text", value: "あなたはどこで走るか" }] },
      { numLabel: "04", title: "全体の流れ", content: [{ type: "text", value: "キックオフ → 中間 → 最終" }] },
    ],
  },
  // Eyebrow with custom color (amber for warning section)
  comparison_amber: {
    layout: "comparison",
    eyebrow: { label: "🔁 最重要ポリシー", color: "warning" },
    title: "ドッグフーディング",
    left: { title: "やる", accentColor: "success", content: [{ type: "bullets", items: ["自分が日常で使う", "失敗の回数だけ進化"] }] },
    right: { title: "やらない", accentColor: "danger", content: [{ type: "bullets", items: ["条件付きの意見", "完成までの議論"] }] },
  },
  // Eyebrow on bigQuote
  big_quote_with_eyebrow: {
    layout: "bigQuote",
    eyebrow: { label: "Let's go" },
    quote: "100の議論より、1つ作って試す。",
    author: "deploy or die.",
  },
  // Phase 3: icon bullets — ✓ / ✕ / ⚠ with per-item status color
  bullets_icons: {
    layout: "columns",
    eyebrow: { label: "Self-check" },
    title: "今日のあなた、どっち?",
    columns: [
      {
        title: "やってる人",
        accentColor: "success",
        content: [
          {
            type: "bullets",
            items: [
              { text: "毎週 deploy している", icon: "ok" },
              { text: "自分のプロダクトを自分で使う", icon: "ok" },
              { text: "週1で発信している", icon: "ok" },
            ],
          },
        ],
      },
      {
        title: "やっていない人",
        accentColor: "danger",
        content: [
          {
            type: "bullets",
            items: [
              { text: "完成してから出そうと考えている", icon: "no" },
              { text: "他の人の意見ばかり気にしている", icon: "warn" },
              { text: "「もし〜だったら」が口癖", icon: "no" },
            ],
          },
        ],
      },
    ],
  },
  // Phase 3: hot timeline — the current quarter glows
  timeline_hot: {
    layout: "timeline",
    eyebrow: { label: "Roadmap", color: "primary" },
    title: "プロジェクトの進捗",
    items: [
      { date: "Q1", title: "Kickoff", description: "全員集合", done: true, color: "success" },
      { date: "Q2", title: "MVP", description: "最初の動くもの", done: true, color: "success" },
      { date: "Q3", title: "Dogfooding", description: "今ここ", hot: true, color: "warning" },
      { date: "Q4", title: "Launch", description: "世に出す" },
    ],
  },
  // Phase 4: *emphasis* + text size variants in one comparison
  phase4_emphasis_sizes: {
    layout: "comparison",
    eyebrow: { label: "Phase 4 preview" },
    title: "サイズと強調の混在",
    subtitle: "lead/big/sub + *amber emphasis* + **bold**",
    left: {
      title: "やる",
      accentColor: "primary",
      ratio: 1.2,
      content: [
        { type: "text", value: "**アイデアだけ**には、価値がない。", size: "big" },
        { type: "text", value: "同じアイデアは1万人が思いつく。作ってリリースするのは、そのうち数人。", size: "lead" },
        { type: "text", value: "議論のための議論は無駄。*10%でも動いたら、すぐ共有。*", size: "sub" },
      ],
    },
    right: {
      title: "やらない",
      accentColor: "danger",
      content: [
        { type: "bullets", size: "lead", items: ["完成してから出そうと考えている", { text: "「もし〜だったら」が口癖", icon: "no", size: "sub" }] },
        { type: "callout", label: "罠", text: "*アイデアを隠す* と、誰もフィードバックをくれない。", color: "warning", size: "sub" },
      ],
    },
  },
  // Phase 4: density=compact on a content-heavy slide
  phase4_density_compact: {
    layout: "comparison",
    density: "compact",
    eyebrow: { label: "Compact density" },
    title: "情報量が多い時はdensity=compact",
    subtitle: "本文・list・padding が全体的に縮小される",
    left: {
      title: "週1のオンライン発表会",
      accentColor: "warning",
      content: [
        { type: "bullets", items: ["Google Meets で開催", "「今週なにを作ったか／何に詰まっているか」を共有", "SSメンターも参加", "**毎月 最低1回は必ず発表**"] },
      ],
    },
    right: {
      title: "週1アウトプット+相互FB",
      accentColor: "warning",
      content: [
        {
          type: "bullets",
          items: ["機能追加・デモ・記事など、媒体は問わない", "**他の参加者へのフィードバックも必須**", "評価する力＝自分を客観視する力", "⏰ 土日朝・平日夜を週ごとに分散"],
        },
      ],
    },
  },
  // Phase 3: manifesto / creed grid
  manifesto_creed: {
    layout: "manifesto",
    eyebrow: { label: "Our 5 commitments", color: "accent" },
    title: "BootCampで大事にしていること",
    stepLabel: "原則",
    columns: 2,
    items: [
      { title: "Deploy or die.", description: "100の議論より1つの実装。動かしてから語る。", accentColor: "primary" },
      { title: "週1アウトプット.", description: "形にして共有 → フィードバック → 改善。", accentColor: "success" },
      { title: "自分で使うものを作る.", description: "ドッグフーディングできないものは続かない。", accentColor: "warning" },
      { title: "相互フィードバック.", description: "孤独に作るより、互いに殴り合う方が速い。", accentColor: "info" },
      { title: "完成主義を捨てる.", description: "60%で出して、走りながら直す。", accentColor: "danger" },
      { title: "deploy or die.", description: "もう一度言う。動いてないアイデアは存在しない。", accentColor: "accent" },
    ],
  },
};

let count = 0;
for (const [themeName, theme] of Object.entries(themes)) {
  for (const [slideKey, slide] of Object.entries(slides)) {
    const html = generateSlideHTML(theme, slide);
    const filename = `${themeName}__${slideKey}.html`;
    fs.writeFileSync(path.join(outDir, filename), html);
    count++;
  }
}

console.log(`Wrote ${count} HTML files to ${outDir}`);
console.log(`Open in a browser, e.g.:  open ${outDir}/dark_studio__title_with_chips.html`);
