import {
  type Filter,
  type Letter,
  type PhoneticModel,
} from "@keybr/phonetic-model";
import { type RNG } from "@keybr/rand";
import { type BigramFilter, type BigramFocusMode } from "./bigramfilter.ts";

export type WordGenerator = () => string | "" | null;

/**
 * Create a word generator that favors words containing target bigrams.
 */
export function bigramWords(
  model: PhoneticModel,
  bigramFilter: BigramFilter,
  baseFilter: Filter,
  random: RNG,
  options: {
    minTargetBigrams?: number;
    maxTargetBigrams?: number;
    maxAttempts?: number;
  } = {},
): WordGenerator {
  const {
    minTargetBigrams = 0,
    maxTargetBigrams = Infinity,
    maxAttempts = 10,
  } = options;

  return () => {
    let attempts = 0;
    let word: string | null = null;

    while (attempts < maxAttempts) {
      word = model.nextWord(baseFilter, random);
      if (word == null) {
        return null;
      }

      // Check bigram requirements
      const targetCount = bigramFilter.countTargetBigrams(word);

      if (targetCount >= minTargetBigrams && targetCount <= maxTargetBigrams) {
        if (bigramFilter.isValidWord(word)) {
          return word;
        }
      }

      attempts++;
    }

    // Fallback: return the last generated word even if not perfect
    return word;
  };
}

/**
 * Create a word generator that only produces words with target bigrams.
 */
export function strictBigramWords(
  model: PhoneticModel,
  bigramFilter: BigramFilter,
  baseFilter: Filter,
  random: RNG,
): WordGenerator {
  return () => {
    const word = model.nextWord(baseFilter, random);
    if (word == null) {
      return null;
    }

    if (bigramFilter.isValidWord(word)) {
      return word;
    }

    return null;
  };
}

/**
 * Create a word generator that repeats target bigrams in sequence.
 * Useful for intensive bigram practice.
 */
export function bigramRepetition(
  bigramFilter: BigramFilter,
  random: RNG,
  options: {
    repeatCount?: number;
  } = {},
): WordGenerator {
  const { repeatCount = 3 } = options;
  const targetArray = [...bigramFilter.targetBigrams];
  let currentIndex = 0;

  return () => {
    if (targetArray.length === 0) {
      return null;
    }

    const bigram = targetArray[currentIndex];
    currentIndex = (currentIndex + 1) % targetArray.length;

    // Repeat the bigram N times with random separators
    const parts: string[] = [];
    for (let i = 0; i < repeatCount; i++) {
      parts.push(bigram);
      if (i < repeatCount - 1) {
        parts.push(random() > 0.5 ? " " : "");
      }
    }

    return parts.join("");
  };
}

/**
 * Count how many times a bigram appears in text.
 */
export function countBigrams(text: string, bigramFilter: BigramFilter): number {
  let count = 0;
  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text.substring(i, i + 2);
    if (bigramFilter.targetBigrams.has(bigram)) {
      count++;
    }
  }
  return count;
}

/**
 * Extract all bigrams from text.
 */
export function extractBigrams(text: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.push(text.substring(i, i + 2).toLowerCase());
  }
  return bigrams;
}
