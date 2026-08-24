# fix: bigQuote のマーカーが装飾引用符を内側に含む (#32)

## 問題

`data-mulmo-path` の契約は「**その要素の中身が値そのもの**」。編集側はマーカーの
`innerHTML` を読んで値に書き戻すので、レンダラが内側に足したものは全部値になる。

`bigQuote` だけこの契約を破っていた:

```ts
parts.push(`  <blockquote ...${dp("quote")}>`);
parts.push(`    &ldquo;${renderInlineMarkup(data.quote)}&rdquo;`);   // 装飾がマーカーの内側
parts.push(`  </blockquote>`);
```

編集のたびに `“ ”` と整形用の改行が値へ入り、**増殖する**（1回目 `“Q”` → 2回目 `“ “Q” ”`）。

## 影響範囲（実測）

全13レイアウト・`data-mulmo-path` 33本を「マーカーの中身 → 値」で往復させたところ、
**32本一致・壊れているのは `bigQuote.quote` の1本だけ**。

## 修正

1. マーカーを内側の `<span>` へ移し、`&ldquo;` / `&rdquo;` はその外に出す。
   `<blockquote>` の見た目は変わらない（span は inline）。
2. `test/slide/test_marker_contract.ts` を追加。全13レイアウトについて、各マーカーの
   開始タグ直後が `renderInlineMarkup(値)` そのもので終わることを検査する。

## なぜ既存テストで防げなかったか

`test_data_mulmo_path.ts` はマーカーの **存在** しか見ていない
(`/<h1[^>]*data-mulmo-path="title"/` のような正規表現)。マーカーの隣に何が
あるかは一切検査していないので、装飾が内側にあっても緑のまま通る。

## break-check

- 修正を revert → 2件 fail（一般契約テストと bigQuote 個別テストの両方）
- 別レイアウト（title）のマーカー内側に `&raquo;` を1文字挿入 → 1件 fail
  (`title.title carries more than its value`)

## golden

`generateSlideHTML` の出力が変わるため golden を更新。全1636ケース中、
**blockquote を含む126ケースちょうど**のハッシュが変化（それ以外は不変）。
