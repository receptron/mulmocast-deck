# Changelog

## 2.0.0 — 2026-08-22

### Changed (breaking)

- **Charts are drawn by one document-level driver, not by a script inside each block** (#28).
  `renderChart` emitted an inline `<script>` so the standalone document Puppeteer opens would
  draw itself. `generateSlideFragment` returned that same markup, which put a `<script>` into
  markup a host embeds — where it cannot run, and does not survive sanitising.

  Removing it downstream turned out to be unsafe: a chart's config is arbitrary user data, so
  a `</script>` inside a chart label ends the block early and leaves its tail behind as markup.
  A chart label of `"</script><p>injected</p>"` is schema-valid and reproduced exactly that.

  So a block emits no `<script>` at all, and `generateSlideHTML` adds one driver for the page
  that reads the `data-mulmo-chart` attribute each canvas already carries — the same attribute
  an embedding host drives. The config is emitted once instead of twice, and the difference
  between the two APIs is what each returns rather than a flag a caller has to pass.

  **What breaks:** `renderContentBlock` / `renderContentBlocks` return different HTML for a
  chart block — the canvas and its `data-mulmo-chart` attribute, with no script. A caller
  relying on that script to draw must either use `generateSlideHTML`, which now supplies the
  driver, or drive `canvas[data-mulmo-chart]` itself:

  ```js
  document.querySelectorAll("canvas[data-mulmo-chart]").forEach((canvas) => {
    new Chart(canvas.getContext("2d"), JSON.parse(canvas.dataset.mulmoChart));
  });
  ```

  `generateSlideHTML`'s rendered result is unchanged: verified in a browser that both canvases
  draw, `data-chart-ready` still goes true, and animation is still disabled for Puppeteer. The
  golden matrix moved for exactly the 126 chart-bearing cases of 1636, and for nothing else.

## 1.2.0 — 2026-08-21

### Added

- **`generateSlideFragment()`** (#27) — renders a slide as embeddable markup instead of a
  standalone document. Returns `{ html, css, scopeClass, requires, chartPlugins, mermaidTheme }`:
  body markup with no `<html>` / `<head>` / `<style>` / `<script>`, and every rule confined to the
  fragment's own scope class.

  Scoping is the point. `.mulmo-intro`, `.density-compact` and `.card-glass` are written globally
  today, which is fine when a document holds one slide and wrong the moment two share a page — the
  second slide's intro preset would win for both.

  Nothing shared between slides is emitted per slide; `requires` names what the host must load once
  for the page. The host supplies `slideUtilityCss`, points its Tailwind build at this package
  (`@source "../node_modules/@mulmocast/deck/lib/**/*.js"`), loads the runtimes, sanitizes the
  markup, and sizes the container.

- **`slideUtilityCss`** (#27) — a static, theme-independent stylesheet backing every `d-*` and
  `font-*` class the deck emits, reading CSS custom properties. Replaces the runtime
  `tailwind.config` a standalone document builds.

- **`buildThemeVars()`** (#27) — a theme as CSS custom property declarations. Because the theme is
  now variables, restyling a rendered slide is a variable write rather than a re-render.

- **`slide.intro` + `slide.staggerMs`** (#17) — opt-in, pure-CSS entrance presets
  (`fade` · `fade-up` · `fade-down` · `slide-left` · `slide-right` · `zoom-in`). With `staggerMs`,
  items in list-based layouts animate sequentially via `.mulmo-stagger` + `nth-child` delays.
  Static renderers are unaffected: `animation-fill-mode: both` lands the final state.
  Shipped in 1.1.0, which was published to npm without a tag or release, so it is recorded here.

### Fixed

- **Chip and eyebrow borders named a colour that does not exist** (#27). Both used
  `border-d-textDim/30`, but `colorKeyMap` maps the theme field `textDim` to the class segment
  `dim`, so the Tailwind config only ever defined `d.dim`. The border fell through to
  `currentColor` — confirmed in a browser, where the chip border computed to the theme's _text_
  colour instead of `textDim` at 30%. Existing decks will see these borders render correctly for
  the first time.

### Changed

- **A chart's config now also rides on its canvas as `data-mulmo-chart`** (#27). The inline
  `<script>` still drives the standalone document, but an injected `<script>` neither executes via
  `innerHTML` nor survives sanitizing, so a host embedding the markup had no way to draw the chart.
  The document is otherwise byte-identical.

### Internal

- **Extracted the four optional `<style>` builders** (#26) — `titleGradient` / `density` /
  `cardGlass` / `intro` moved out of `generateSlideHTML` into named functions returning raw CSS,
  wrapped by a shared `styleTag()`. Byte-identical output, verified against 1636 generated cases.
- **Characterization tests** (#26) — `render_matrix.ts` records the input matrix that matters;
  `test_render_golden.ts` pins every case's output by hash; `test_style_blocks.ts` states each rule
  set's exact CSS and which selectors are anchored to a marker class.
- **`slideUtilityCss` coverage is machine-checked** (#27) — the test scans `src/` for every `d-*`
  and `font-*` class the deck can emit, including dynamic ones built through `c()` and those
  carrying an alpha suffix, and fails if a rule is missing. A missing rule renders unstyled, which
  nothing else would notice.
- **Static analysis** (#24) — jscpd (copy/paste) and knip (dead code) workflows, both report-only.

### Maintenance

- Dev dependencies: eslint `^10.8.1`, globals `^17.11.0`, knip `^6.32.2`, tsx `^4.23.12`,
  typescript-eslint `^8.67.0`. Verified from a clean `yarn install --frozen-lockfile`.
- Dependency maintenance (#23), safe dev-dependency bumps (#20), GitHub Actions to latest +
  Node 24 matrix (#19) (#21).
- Dependabot: esbuild 0.28.0 → 0.28.1 (#18), brace-expansion 5.0.6 → 5.0.7 (#22).
