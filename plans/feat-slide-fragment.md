# generateSlideFragment() — div に埋め込める body 断片を返す

receptron/mulmocast-deck#25

## ゴール

`<div>` に直接埋め込める断片を返す API を追加する。既存の `generateSlideHTML()` は無変更。

```ts
export type SlideFragment = {
  html: string;                          // body 相当のみ。<html>/<head>/<script> を含まない
  css: string;                           // scopeClass 配下にスコープ済み
  requires: ("chart" | "mermaid")[];     // 親が1回だけロードすべき外部ランタイム
  chartPlugins: string[];                // sankey / treemap 等の追加 CDN
  scopeClass: string;                    // 呼び出し側がコンテナに付けるクラス
};

export const generateSlideFragment = (
  theme: SlideTheme,
  slide: SlideLayout,
  options?: { reference?: string; branding?: ResolvedBranding; scopeClass?: string },
): SlideFragment;
```

## 原則

**断片は body だけ。`<head>` 資産と CDN を一切吐かない。**
Tailwind CSS / chart.js / mermaid / フォントは beat 間で共通なので、
断片ごとに吐くと一覧表示で N 重ロードになる。何が要るかは `requires` で申告し、
親が和集合を 1 回だけ用意する。

## 現状の障害は 3 点だけ

`generateSlideHTML()` (`src/render.ts:117`) が組み立てる `<style>` は、実はほぼクラススコープ済み。

| 生成物 | セレクタ | 断片で使えるか |
|---|---|---|
| `densityCss` | `.density-compact ...` | ✅ そのまま |
| `cardGlassCss` | `.card-glass ...` | ✅ そのまま |
| `introCss` | `.mulmo-intro` / `.mulmo-stagger ...` | ✅ そのまま |
| `titleGradientCss` | `h1.font-title.font-bold` | ❌ グローバル。要スコープ |
| 固定 style | `html, body { height:100% }` | ❌ 出力しない |
| `tailwind.config` | ランタイム注入の `d-*` | ❌ CSS 変数化 |

## PR 分割

deck も 2 PR に割る。1 本目は**挙動不変が唯一の主張**なので、独立して検証・revert できる。

| # | 内容 | 主張 |
|---|---|---|
| 1 | CSS ビルダーの抽出 ＋ スコープ接頭辞の導入（リファクタのみ） | `generateSlideHTML()` の出力がバイト単位で不変 |
| 2 | `generateSlideFragment()` ＋ テーマ CSS 変数 ＋ `slideUtilityCss` | 新 API の追加 |

### PR 1 でやること: スコープ接頭辞つき CSS ビルダー

`generateSlideHTML()` 内でインラインに組み立てている 4 つの `<style>` を、
**生 CSS を返す関数**に切り出し、スコープ接頭辞を引数で受け取る。

| 現状 | 切り出し後 |
|---|---|
| `titleGradientCss`（インライン） | `buildTitleGradientCss(theme, scope)` |
| `densityCss`（インライン） | `buildDensityCss(slide, scope)` |
| `cardGlassCss`（インライン） | `buildCardGlassCss(theme, scope)` |
| `buildIntroCss(intro, staggerMs)` | `buildIntroCss(intro, staggerMs, scope)` |

`generateSlideHTML()` は `scope = ""` で呼び、`\n<style>${css}</style>` で包み直す
（4 つとも「空文字列」か「`\n<style>...</style>`」のどちらかなので、
包み直しで元の出力を厳密に再現できる）。

**なぜスコープが要るか。** `.density-compact` / `.card-glass` / `.mulmo-intro` /
`.mulmo-stagger` はいずれも**スライドの root div に付くクラス**なのに、
CSS 側は `.mulmo-intro{animation:mulmoIntroFade ...}` のようにグローバルに定義されている。
1 ページに 1 スライドしか無い iframe では問題にならないが、
**一覧表示で intro プリセットや staggerMs の異なるスライドが並ぶと後勝ちで互いを上書きする。**
接頭辞は `""`（従来）と `.mulmo-slide-N`（断片）を切り替えられる形にしておく。

## PR 2 の手順

### 1. `d-*` を CSS 変数として出す
`src/utils.ts:114` の `colorKeyMap` を再利用し、`buildThemeVars(theme)` を追加。
`--d-bg: #FFFBEB; --d-primary: #EA580C; ...` と
`--d-font-title` / `--d-font-body` / `--d-font-mono` / `--d-font-accent` を返す。
`buildTailwindConfig()` は `generateSlideHTML()` 用にそのまま残す。

### 2. 静的ユーティリティ CSS を export
`d-*` は **13 色 × ユーティリティ接頭辞 ＋ 4 フォント族の有限集合**なので全列挙できる。
`colorKeyMap` の値から `bg-` / `text-` / `border-` / `from-` / `to-` / `via-` を生成:

```css
.bg-d-primary { background-color: var(--d-primary) }
.text-d-muted { color: var(--d-muted) }
.font-title   { font-family: var(--d-font-title) }
```

`slideUtilityCss`（文字列）として export。**共通物なので親が 1 回だけ読む。**
接頭辞の網羅は `src/**/*.ts` を走査して実際に使われている `d-` クラスを
突き合わせるテストで担保する（取りこぼし＝無スタイル描画になるため）。

### 3. `generateSlideFragment()` 本体
`generateSlideHTML()` から body 生成部分（`src/render.ts:184` 以降のテンプレート）を
`buildSlideBody()` に切り出し、両者から呼ぶ。
`titleGradientCss` は `.${scopeClass} h1.font-title.font-bold` にスコープ。
`html, body` ルールは出力しない。
`buildCdnScripts()` (`src/render.ts:66`) は呼ばず、`detectBlockTypes()` の結果を
`requires` / `chartPlugins` として返す（`detectBlockTypes` は既に
`{ hasChart, hasMermaid, chartPlugins }` を返しているのでそのまま使える）。

`scopeClass` は既定で `mulmo-slide-<n>`。`n` は既存の `resetSlideIdCounter()`
と同じ決定的カウンタに乗せる（スナップショットテストの再現性）。

### 4. `generateSlideHTML()` の無変更を証明する
**PR 1 の唯一かつ最重要の主張。**「挙動同一」は読んで判断しない。

- リファクタ前の `generateSlideHTML` を丸ごと使い捨てハーネスへ複製
- `test/slide/` の既存フィクスチャ ＋ 全 13 layout × テーマ/density/cardStyle/intro/
  branding/reference の組み合わせを生成入力として流す
- **新旧の出力文字列を完全一致で比較**し、一致件数を PR 本文に書く
- `/refactor-safely` に従う

### 5. テスト
`test/slide/test_fragment.ts` を追加（`node:test` + `node:assert`、既存の作法に合わせる）。

- 断片に `<!DOCTYPE` / `<html` / `<head` / `<script` が**含まれない**こと
- `html, body` ルールを含まないこと
- `titleGradient` 指定時、CSS が `scopeClass` にスコープされていること
- chart ブロックを含むスライドで `requires` に `"chart"` が入ること
- 同じ入力なら `scopeClass` が決定的であること
- `slideUtilityCss` が `src/` 内で使われる全 `d-*` クラスを網羅していること

## 決めること（issue のチェックリスト）

- [ ] `generateSlideHTML()` を fragment 版の上に再実装するか（→ 手順 4 の差分検証が必須）
- [ ] `slideUtilityCss` の配布形態（TS 文字列 / `.css` ファイル / 両方）
- [ ] `d-*` の CSS 変数化を `generateSlideHTML()` 側にも適用するか

## やらないこと

- `generateSlideHTML()` の出力変更（Puppeteer / PDF / 動画パイプラインに影響するため）
- 標準 Tailwind ユーティリティの CSS 生成（消費側の責務。README に明記するのみ）
