# chart プラグイン表を Map にする

receptron/mulmocast-deck#40

## 問題

`CHART_PLUGIN_CDNS` は object literal で、chart type（スクリプト由来の任意の文字列）で引いている。
`constructor` / `toString` / `__proto__` などが `Object.prototype` 経由でヒットし、
`chartPlugins` に関数が入り、`generateSlideHTML` は `<script src="function Object() { [native code] }">` を出す。

## 直し方

表を `Map` にし、chart type が文字列のときだけ引く（receptron/mulmocast-cli#1534 と同じ直し方）。

## 挙動が変わる範囲

旧実装をそのまま写した関数と新実装を、生成した chart type（`Object.prototype` のメンバ名すべて、実在の型、乱数文字列、
文字列以外、複数ブロックの組み合わせ）で突き合わせた。違いが出るのは次の 2 つだけ:

- `Object.prototype` のメンバ名 → 旧: 関数・オブジェクトを返す / 新: プラグインなし
- 配列の type（`["sankey"]`）→ 旧: 文字列化されてヒット / 新: プラグインなし（Chart.js も配列の type は受け付けない）

既存出力の golden（`test_render_golden.ts`）は更新せずに緑。
