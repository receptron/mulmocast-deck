# fix: `**bold**` / `{color:text}` が改行をまたぐと機能しない (#36)

## 症状

`renderInlineMarkup` は `\n` → `<br>` を公式にサポートしているのに、
`**bold**` と `{color:text}` は `\n` をまたぐと**黙って記法がそのまま本文に出る**。

```
renderInlineMarkup("**プリンシパル\nシステムアーキテクト**")
// → **プリンシパル<br>システムアーキテクト**   ← ** が残る
renderInlineMarkup("{primary:継続すること\nが大切}")
// → {primary:継続すること<br>が大切}          ← 記法が残る
```

再現済み（src/utils.ts を直接叩いて確認）。エラーも警告も出ないので、
スライドを目視するまで気づけない。

## 原因

`src/utils.ts` の `renderInlineMarkup`。JS の `.` は `s` フラグ無しで `\n` にマッチしない。

- L53 `/\*\*(.+?)\*\*/g` — `.` が `\n` を食えない
- L57 `/\{([a-z]+):(.+?)\}/g` — 同上
- L64 `/\n/g → <br>` — 改行は正式にサポート

隣の単一 `*` 強調 (L55) だけが `[^*\n]` で **明示的に** `\n` を除外しており、
3 つの規則が不揃いになっている。

## 方針

L53 / L57 の `.` を `[\s\S]` にする（issue #36 の提案どおり）。
`s` フラグではなく文字クラスにするのは、同じ正規表現内の他の `.` に影響させないため
（現状は他に `.` は無いが、意図を局所化しておく）。

CommonMark でも strong emphasis は段落内の改行をまたげるので、
「またげる」方が markdown 由来の記法として自然。

`\n` → `<br>` は後段で走るので、`<strong>` / `<span>` の内側の改行も `<br>` になる。

### `*emphasis*` (L55) は今回変更しない

issue #36 は L55 の `[^*\n]` を「明示的な設計判断」として扱い、修正対象を L53 / L57 に
限定している。単一 `*` は行頭の箇条書きや掛け算など誤検出源が多く、複数行に広げると
巻き込みリスクが上がるため、今回は据え置き、PR の Items to Confirm で確認する。

## 変更

1. `src/utils.ts`: bold / `{color:}` の `.` → `[\s\S]`、doc コメントに改行可を明記
2. `test/slide/test_blocks.ts`: issue の再現 5 ケース + 回帰ケースを追加
3. `README.md`: inline markup 節に「装飾は改行をまたげる（`*em*` を除く）」を追記
4. `docs/ChangeLog.md`: Unreleased に Fixed エントリ

## 検証

- 差分ハーネス: `\n` を含まない生成入力について旧実装と新実装の出力が
  **完全一致**することを確認（改行を含まない既存デッキは byte-identical）
- `yarn format` → `yarn lint` → `yarn build` → `yarn typecheck` → `yarn test`
