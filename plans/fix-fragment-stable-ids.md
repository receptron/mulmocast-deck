# scopeClass を渡した断片の id を描画ごとに安定させる

receptron/mulmocast-deck#41

## 問題

`generateSlideFragment` の chart / mermaid の id はモジュール共有の連番で、同じスライドを同じ `scopeClass` で
描き直しても毎回変わる。html を文字列で比べるホストは、描き直すたびに注入し直す。

## 直し方

- `withSlideIdScope(scope, render)`: その描画の中だけ、id を `${scope}-${prefix}-${n}`（n は 0 から）にする。
  終わったら（throw しても）外側に戻す
- `generateSlideFragment` は呼び出し側が `scopeClass` を渡したときだけこれで包む。生成した scope class は
  どうせ毎回変わるので、そのときは今と同じ共有連番

## 変わらないもの

- `generateSlideHTML`: 共有連番のまま。golden（`test_render_golden.ts`）は更新せずに緑
- `scopeClass` なしの `generateSlideFragment`
- 断片と文書の本文一致テストは、scope class に加えて id の接頭辞を正規化して比べる
