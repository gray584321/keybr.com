import { type CodePoint } from "@keybr/unicode";

export type BigramFocusMode =
  | "any" // Text contains at least one target bigram
  | "every" // Every bigram in text must be a target
  | "exclude"; // Avoid specific bigrams

/**
 * Filter for bigram-constrained text generation.
 */
export class BigramFilter {
  readonly targetBigrams: ReadonlySet<string>;
  readonly focusMode: BigramFocusMode;

  constructor(bigrams: readonly string[], focusMode: BigramFocusMode = "any") {
    if (bigrams.length === 0) {
      throw new Error("At least one bigram must be specified");
    }
    this.targetBigrams = new Set(bigrams.map(normalizeBigram));
    this.focusMode = focusMode;
  }

  /**
   * Check if a specific bigram is a target.
   */
  containsTarget(
    first: CodePoint | string,
    second: CodePoint | string,
  ): boolean {
    const key = normalizeBigram(first, second);
    return this.targetBigrams.has(key);
  }

  /**
   * Check if a bigram is allowed (for 'exclude' mode).
   */
  allowsBigram(first: CodePoint | string, second: CodePoint | string): boolean {
    const key = normalizeBigram(first, second);
    if (this.focusMode === "exclude") {
      return !this.targetBigrams.has(key);
    }
    return true;
  }

  /**
   * Check if a word contains at least one target bigram.
   */
  wordContainsTarget(word: string): boolean {
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.substring(i, i + 2);
      if (this.targetBigrams.has(bigram)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Count target bigrams in a word.
   */
  countTargetBigrams(word: string): number {
    let count = 0;
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.substring(i, i + 2);
      if (this.targetBigrams.has(bigram)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if a word is valid according to this filter.
   */
  isValidWord(word: string): boolean {
    switch (this.focusMode) {
      case "any":
        return this.wordContainsTarget(word);
      case "every":
        return this.wordIsOnlyTargets(word);
      case "exclude":
        return !this.wordContainsTarget(word);
    }
  }

  /**
   * Check if all bigrams in a word are targets.
   */
  private wordIsOnlyTargets(word: string): boolean {
    if (word.length < 2) {
      return false;
    }
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.substring(i, i + 2);
      if (!this.targetBigrams.has(bigram)) {
        return false;
      }
    }
    return true;
  }
}

function normalizeBigram(
  first: CodePoint | string,
  second: CodePoint | string,
): string {
  const firstCp = typeof first === "string" ? first.charCodeAt(0) : first;
  const secondCp = typeof second === "string" ? second.charCodeAt(0) : second;
  return String.fromCodePoint(firstCp, secondCp).toLowerCase();
}

/**
 * Common English bigrams for defaults.
 */
export const COMMON_ENGLISH_BIGRAMS = [
  "th",
  "he",
  "in",
  "er",
  "an",
  "re",
  "on",
  "at",
  "en",
  "nd",
  "ti",
  "es",
  "or",
  "te",
  "of",
  "ed",
  "is",
  "it",
  "al",
  "ar",
] as const;

/**
 * Same-finger bigrams for QWERTY layout.
 */
export const QWERTY_SAME_FINGER_BIGRAMS = [
  "qq",
  "ww",
  "ee",
  "rr",
  "tt",
  "yy",
  "uu",
  "ii",
  "oo",
  "pp",
  "aa",
  "ss",
  "dd",
  "ff",
  "gg",
  "hh",
  "jj",
  "kk",
  "ll",
  "zz",
  "xx",
  "cc",
  "vv",
  "bb",
  "nn",
  "mm",
] as const;

/**
 * Difficult trigrams (same finger or awkward transitions).
 */
export const DIFFICULT_TRIGRAMS = [
  "the",
  "and",
  "ing",
  "ion",
  "tio",
  "ent",
  "her",
  "for",
  "tha",
  "ate",
  "tion",
  "ment",
  "ing",
] as const;
