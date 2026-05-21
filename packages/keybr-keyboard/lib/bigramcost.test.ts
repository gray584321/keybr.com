import { test } from "node:test";
import { equal } from "rich-assert";
import { bigramCost, isSameFinger } from "./bigramcost.ts";
import { Layout } from "./layout.ts";
import { loadKeyboard } from "./load.ts";

const qwerty = loadKeyboard(Layout.EN_US);

function cp(s: string): number {
  return s.charCodeAt(0);
}

test("same physical key pressed twice is classified as repeat", () => {
  const cost = bigramCost(qwerty, cp("a"), cp("a"));
  equal(cost?.class, "repeat");
});

test("classic QWERTY same-finger bigrams are classified as sfb", () => {
  // "ed" — both on left middle finger.
  equal(bigramCost(qwerty, cp("e"), cp("d"))?.class, "sfb");
  // "rt" — both on left index finger.
  equal(bigramCost(qwerty, cp("r"), cp("t"))?.class, "sfb");
  // "ki" — both on right middle finger.
  equal(bigramCost(qwerty, cp("k"), cp("i"))?.class, "sfb");
});

test("cross-hand bigrams are alternation", () => {
  // "fj" — left index → right index, different hands.
  equal(bigramCost(qwerty, cp("f"), cp("j"))?.class, "alternation");
  // "th" — left index → right index.
  equal(bigramCost(qwerty, cp("t"), cp("h"))?.class, "alternation");
});

test("same-hand same-row neighbours are rolls", () => {
  // "as" — left pinky → left ring, inward roll.
  equal(bigramCost(qwerty, cp("a"), cp("s"))?.class, "roll-in");
  // "sa" — left ring → left pinky, outward roll.
  equal(bigramCost(qwerty, cp("s"), cp("a"))?.class, "roll-out");
});

test("top-row to bottom-row same-hand jump is a scissor", () => {
  // "qz" — left pinky (top) → left pinky (bottom): but that's an SFB by
  // finger, so check a cross-finger case instead.
  // "qx" — left pinky top → left ring bottom = two-row, adjacent fingers.
  equal(bigramCost(qwerty, cp("q"), cp("x"))?.class, "scissor");
});

test("isSameFinger matches the bigramCost sfb classification", () => {
  equal(isSameFinger(qwerty, cp("e"), cp("d")), true); // SFB
  equal(isSameFinger(qwerty, cp("f"), cp("j")), false); // alternation
  equal(isSameFinger(qwerty, cp("a"), cp("s")), false); // roll
  equal(isSameFinger(qwerty, cp("a"), cp("a")), false); // repeat (not SFB)
});

test("characters not on the layout return null", () => {
  // Unicode snowman (☃) — not on any QWERTY key.
  equal(bigramCost(qwerty, cp("a"), 0x2603), null);
});

test("finger weights are populated for both keys", () => {
  const cost = bigramCost(qwerty, cp("a"), cp("k"));
  // 'a' is left pinky (1.6), 'k' is right middle (1.1).
  equal(cost?.fingerWeightA, 1.6);
  equal(cost?.fingerWeightB, 1.1);
});
