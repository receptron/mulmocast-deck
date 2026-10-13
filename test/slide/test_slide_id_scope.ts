import test from "node:test";
import assert from "node:assert";
import { generateSlideId, resetSlideIdCounter, withSlideIdScope } from "../../src/utils.js";

test("withSlideIdScope: ids come from the scope and count from zero", () => {
  assert.deepStrictEqual(
    withSlideIdScope("s", () => [generateSlideId("chart"), generateSlideId("mermaid")]),
    ["s-chart-0", "s-mermaid-1"],
  );
  assert.strictEqual(
    withSlideIdScope("s", () => generateSlideId("chart")),
    "s-chart-0",
    "each scoped render starts again",
  );
});

test("withSlideIdScope: the outer scope is restored, even when the render throws", () => {
  resetSlideIdCounter();
  assert.throws(() =>
    withSlideIdScope("s", () => {
      throw new Error("boom");
    }),
  );
  assert.strictEqual(generateSlideId("chart"), "chart-0", "back on the shared counter");
  withSlideIdScope("outer", () => {
    generateSlideId("chart");
    assert.strictEqual(
      withSlideIdScope("inner", () => generateSlideId("chart")),
      "inner-chart-0",
    );
    assert.strictEqual(generateSlideId("chart"), "outer-chart-1", "the outer count resumes");
  });
});
