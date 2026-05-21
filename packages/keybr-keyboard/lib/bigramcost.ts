import { type CodePoint } from "@keybr/unicode";
import { type Keyboard } from "./keyboard.ts";
import { type KeyShape } from "./keyshape.ts";
import { type ZoneId } from "./types.ts";

/**
 * Biomechanical classification of a two-key sequence.
 *
 * Hierarchy of cost (most → least desirable, derived from typing-layout
 * research e.g. Trialyzer, Carpalx, oxeylyzer): inward roll → alternation →
 * outward roll → redirect → lateral stretch → scissor → same-finger bigram.
 */
export type BigramClass =
  | "repeat" // same physical key pressed twice (e.g. "ll")
  | "sfb" // same finger, different keys (e.g. "ed" on QWERTY)
  | "scissor" // same hand, adjacent fingers, two-row jump
  | "lsb" // same hand, adjacent fingers, large lateral stretch
  | "roll-in" // same hand, outer finger → inner finger
  | "roll-out" // same hand, inner finger → outer finger
  | "alternation" // opposite hands
  | "unknown"; // one or both keys not on layout

/**
 * Per-finger weight that reflects relative typing speed / fatigue cost.
 * Lower index → faster / more independent finger.
 * Sourced from finger-independence studies (PMC6773164).
 */
export const FINGER_WEIGHT: Readonly<Record<ZoneId, number>> = Object.freeze({
  thumb: 0.8,
  leftIndex: 1.0,
  rightIndex: 1.0,
  middle: 1.1,
  ring: 1.4,
  pinky: 1.6,
  // Non-finger zones default to 1.0 — only finger zones are looked up here.
  left: 1.0,
  right: 1.0,
  digit: 1.0,
  top: 1.0,
  home: 1.0,
  bottom: 1.0,
});

// Finger order (outer → inner) used to determine roll direction.
const FINGER_INDEX: Readonly<Record<ZoneId, number>> = Object.freeze({
  pinky: 0,
  ring: 1,
  middle: 2,
  leftIndex: 3,
  rightIndex: 3,
  thumb: 4,
  left: -1,
  right: -1,
  digit: -1,
  top: -1,
  home: -1,
  bottom: -1,
});

const ROW_INDEX: Readonly<Record<ZoneId, number>> = Object.freeze({
  digit: 0,
  top: 1,
  home: 2,
  bottom: 3,
  pinky: -1,
  ring: -1,
  middle: -1,
  leftIndex: -1,
  rightIndex: -1,
  thumb: -1,
  left: -1,
  right: -1,
});

export type BigramCost = {
  readonly a: KeyShape;
  readonly b: KeyShape;
  readonly class: BigramClass;
  readonly fingerWeightA: number;
  readonly fingerWeightB: number;
  readonly handChange: boolean;
  readonly rowDelta: number;
  readonly distance: number;
};

/**
 * Look up the KeyShape for a code point on the given keyboard, or null if
 * the character is not produced by any key (e.g. cross-layout characters).
 */
export function getKeyShape(
  keyboard: Keyboard,
  codePoint: CodePoint,
): KeyShape | null {
  const combo = keyboard.getCombo(codePoint);
  if (combo == null) return null;
  return keyboard.getShape(combo.id);
}

/**
 * Classify the two-key sequence `a → b` on the given keyboard. When either
 * code point is not on the active layout, returns null.
 */
export function bigramCost(
  keyboard: Keyboard,
  a: CodePoint,
  b: CodePoint,
): BigramCost | null {
  const shapeA = getKeyShape(keyboard, a);
  const shapeB = getKeyShape(keyboard, b);
  if (shapeA == null || shapeB == null) return null;
  return classifyBigramCost(shapeA, shapeB);
}

/**
 * Classify a two-key sequence given pre-resolved KeyShape values.
 * Useful when callers already have shapes in hand (e.g. when iterating
 * a heatmap layer).
 */
export function classifyBigramCost(a: KeyShape, b: KeyShape): BigramCost {
  const fingerWeightA = a.finger != null ? FINGER_WEIGHT[a.finger] : 1.0;
  const fingerWeightB = b.finger != null ? FINGER_WEIGHT[b.finger] : 1.0;
  const handChange = a.hand != null && b.hand != null && a.hand !== b.hand;
  const rowA = a.row != null ? ROW_INDEX[a.row] : -1;
  const rowB = b.row != null ? ROW_INDEX[b.row] : -1;
  const rowDelta = rowA >= 0 && rowB >= 0 ? Math.abs(rowA - rowB) : 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return {
    a,
    b,
    class: classify(a, b, handChange, rowDelta, distance),
    fingerWeightA,
    fingerWeightB,
    handChange,
    rowDelta,
    distance,
  };
}

function classify(
  a: KeyShape,
  b: KeyShape,
  handChange: boolean,
  rowDelta: number,
  distance: number,
): BigramClass {
  if (a.id === b.id) return "repeat";
  if (a.finger == null || b.finger == null) return "unknown";

  if (handChange) return "alternation";

  // Same hand from here on.
  if (a.finger === b.finger) return "sfb";

  // Scissor: same hand, two-row jump in opposite directions across fingers.
  // We use rowDelta >= 2 as a proxy — research conventions vary, but a top
  // ↔ bottom jump on the same hand is the canonical scissor case.
  if (rowDelta >= 2) return "scissor";

  // Lateral stretch: same hand, large horizontal distance even when in the
  // same row (e.g. index finger reaching to a center column). Threshold
  // chosen as 1.75 key-widths empirically — covers stretches like "br" on
  // QWERTY without misclassifying ordinary same-row neighbours.
  if (distance >= 1.75) return "lsb";

  const fingerIndexA = FINGER_INDEX[a.finger];
  const fingerIndexB = FINGER_INDEX[b.finger];
  if (fingerIndexA < 0 || fingerIndexB < 0) return "unknown";

  // Inward roll: outer finger → inner finger (e.g. pinky → ring → middle).
  // Outward roll: inner → outer.
  return fingerIndexA < fingerIndexB ? "roll-in" : "roll-out";
}

/**
 * Convenience predicate: true if `a` and `b` are typed by the same finger
 * (and the finger zone is resolvable for both).
 */
export function isSameFinger(
  keyboard: Keyboard,
  a: CodePoint,
  b: CodePoint,
): boolean {
  const shapeA = getKeyShape(keyboard, a);
  const shapeB = getKeyShape(keyboard, b);
  return (
    shapeA != null &&
    shapeB != null &&
    shapeA.finger != null &&
    shapeA.finger === shapeB.finger &&
    shapeA.id !== shapeB.id
  );
}
