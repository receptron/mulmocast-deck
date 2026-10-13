# figure レイアウト — ブロック一つをスライドいっぱいに描く

receptron/mulmocast-deck#39（呼び出し側: receptron/mulmocast-cli#1634）

## ゴール

`chart` / `mermaid` ブロック一つを、ヘッダーの下の残り全部に広げて描くレイアウトを足す。

```ts
{ layout: "figure", title: "Quarterly Revenue", figure: { type: "chart", chartData: { … } } }
{ layout: "figure", title: "Flow", figure: { type: "mermaid", code: "graph TD; A-->B" } }
```

## なぜ既存レイアウトでは足りないか

`split` / `columns` / `grid` / `matrix` は、ブロックを包む要素が縦に伸びない
（`items-start` や `space-y-*`）。実ブラウザで chart は Chart.js の既定 150px、
mermaid は素の大きさのまま。詳細は #39。

## 設計

- スキーマ: `figureSlideSchema` = `slideBaseFields` ＋ `title` ＋ `stepLabel?` ＋ `subtitle?` ＋
  `figure: chartBlockSchema | mermaidBlockSchema`（既存スキーマの再利用）
- 描画: `slideHeader` の下に余白付きの外枠、その中にブロックの見出し（`blockTitle`）、その下に
  `mulmo-figure relative flex-1 min-h-0 flex flex-col` の箱。箱の中身は見出しを外した `renderContentBlock`
  （chart / mermaid の markup を二重に持たない）
  - 見出しを箱の外に出すのは、mermaid を `inset:0` で箱に合わせるため。箱の中にあると図が見出しを覆う
- mermaid の拡大: スコープ済み CSS を `buildSlideRuleSets` に足す（layout が figure のときだけ）。
  `generateSlideHTML` と `generateSlideFragment` の両方が同じルールを得る
  - `.mermaid` を枠いっぱいに絶対配置し、`svg` を `width/height:100%`。mermaid が svg に
    インラインで書く `max-width` を上書きするので `!important`
- `requires` / `chartPlugins` / `mermaidTheme`: `collectContentArrays` に figure を足す

## 検証

- 既存レイアウトの出力不変: golden（`test_render_golden.ts`）を**更新せず**緑
- 単体テスト: スキーマ（chart / mermaid 以外を拒否）、描画、検出、CSS が figure のときだけ出ること
- 実ブラウザ: chart と mermaid（縦長・横長）が 1280×720 の枠いっぱいに描かれること

## 範囲外

- `image` など他のブロック（必要になったら追加）
