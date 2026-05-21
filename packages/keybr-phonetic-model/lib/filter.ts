import {
  type CodePoint,
  type CodePointSet,
  type HasCodePoint,
} from "@keybr/unicode";
import { Letter, type LetterLike } from "./letter.ts";

/**
 * Two-level map specifying frequency multipliers for target bigrams.
 * Outer key: the previous code point in the word being generated.
 * Inner key: the candidate next code point.
 * Value: frequency multiplier to apply at the sampling step
 * (clamped at the consumer; values outside [1, 10] are not recommended).
 */
export type BigramBoost = ReadonlyMap<
  CodePoint,
  ReadonlyMap<CodePoint, number>
>;

export class Filter {
  static readonly empty = new Filter(null, null);

  /**
   * Codepoints of the letters from which to generate words.
   */
  readonly codePoints: CodePointSet | null;
  /**
   * Codepoint of the letter which must appear in each generated word.
   */
  readonly focusedCodePoint: CodePoint | null;
  /**
   * Optional per-transition frequency multipliers. When set, the phonetic
   * model multiplies the candidate-character frequency by
   * `bigramBoost.get(prev)?.get(next) ?? 1` at each step, biasing the
   * generator toward producing words containing those target pairs without
   * resorting to rejection sampling.
   */
  readonly bigramBoost: BigramBoost | null;

  constructor(
    letters0: readonly LetterLike[] | null = null,
    focused0: LetterLike | null = null,
    bigramBoost: BigramBoost | null = null,
  ) {
    const letters = letters0 && letters0.map(Letter.toLetter);
    const focused = focused0 && Letter.toLetter(focused0);
    if (letters != null && letters.length === 0) {
      throw new Error();
    }
    if (letters != null && focused != null && !letters.includes(focused)) {
      throw new Error();
    }
    this.codePoints = letters && new Set(letters.map(codePointOf));
    this.focusedCodePoint = focused && codePointOf(focused);
    this.bigramBoost = bigramBoost;
  }

  /**
   * Returns a value indicating whether the given codepoint
   * is allowed by this filter.
   *
   * Empty filter allows all characters.
   */
  includes(codePoint: CodePoint): boolean {
    return this.codePoints == null || this.codePoints.has(codePoint);
  }

  /**
   * Lookup the boost multiplier for transitioning from `prev` to `next`,
   * defaulting to 1 (no boost) when no entry exists.
   */
  boostFor(prev: CodePoint, next: CodePoint): number {
    return this.bigramBoost?.get(prev)?.get(next) ?? 1;
  }
}

const codePointOf = ({ codePoint }: HasCodePoint): CodePoint => {
  return codePoint;
};
