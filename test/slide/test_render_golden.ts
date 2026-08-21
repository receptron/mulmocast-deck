import test from "node:test";
import assert from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateSlideHTML } from "../../src/render.js";
import { resetSlideIdCounter } from "../../src/utils.js";
import { renderMatrix, type RenderCase } from "./render_matrix.js";

// Characterization test: pins the exact bytes generateSlideHTML produces for every
// case in the input matrix. Its job is to make an unintended output change fail
// loudly — the per-feature tests elsewhere assert that a rule is present, which
// cannot notice a change to a rule that stays present.
//
// To accept an intentional output change:  UPDATE_GOLDEN=1 yarn test
// The resulting diff is the change, case by case, and belongs in the PR.

const GOLDEN_PATH = join(dirname(fileURLToPath(import.meta.url)), "__golden__", "render_matrix.txt");
const HASH_LEN = 16;

const renderCase = (c: RenderCase): string => {
  // generateSlideId() runs off a module-level counter, so ids depend on how many
  // slides were rendered before this one. Reset per case to keep hashes stable.
  resetSlideIdCounter();
  try {
    return generateSlideHTML(c.theme, c.slide, c.reference, c.branding);
  } catch (e) {
    return "threw:" + (e instanceof Error ? e.message : String(e));
  }
};

const digest = (s: string): string => createHash("sha256").update(s).digest("hex").slice(0, HASH_LEN);

const actual = renderMatrix.map((c) => `${c.tag}\t${digest(renderCase(c))}`);

if (process.env.UPDATE_GOLDEN === "1") {
  writeFileSync(GOLDEN_PATH, actual.join("\n") + "\n");
}

test("generateSlideHTML: output is byte-identical to the recorded golden", () => {
  const expected = readFileSync(GOLDEN_PATH, "utf8").trimEnd().split("\n");

  // A golden that has drifted out of step with the matrix cannot compare anything,
  // so fail on the length before comparing rows.
  assert.strictEqual(actual.length, expected.length, `matrix has ${actual.length} cases but golden has ${expected.length}. Regenerate with UPDATE_GOLDEN=1.`);

  const changed = actual.flatMap((line, i) => (line === expected[i] ? [] : [`  ${expected[i]}  →  ${line}`]));
  assert.deepStrictEqual(
    changed,
    [],
    `${changed.length} of ${actual.length} cases changed:\n${changed.slice(0, 10).join("\n")}` +
      (changed.length > 10 ? `\n  ...and ${changed.length - 10} more` : ""),
  );
});

test("golden matrix covers the axes it claims to", () => {
  // Guards the generator itself: a matrix that silently stopped producing one of
  // these shapes would let the golden pass while measuring nothing about it.
  const tags = renderMatrix.map((c) => c.tag).join("|");
  ["tg=safe", "tg=unsafe", "tg=none", "cs=glass", "den=compact", "stg=0", "stg=-5", "stg=120", "intro=fade", "intro=zoom-in"].forEach((axis) =>
    assert.ok(tags.includes(axis), `matrix lost coverage of ${axis}`),
  );
  const layouts = new Set(renderMatrix.flatMap((c) => (c.tag.startsWith("B:layout=") ? [c.tag.split(",")[0]] : [])));
  assert.strictEqual(layouts.size, 13, "every layout should appear in sweep B");
});
