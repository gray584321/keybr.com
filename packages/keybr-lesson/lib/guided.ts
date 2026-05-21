import { type WordList } from "@keybr/content";
import { type Keyboard } from "@keybr/keyboard";
import { Filter, Letter, type PhoneticModel } from "@keybr/phonetic-model";
import { type RNGStream } from "@keybr/rand";
import { type KeySample, type KeyStatsMap } from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { Dictionary, filterWordList } from "./dictionary.ts";
import { LessonKey, LessonKeys } from "./key.ts";
import { Lesson } from "./lesson.ts";
import { lessonProps } from "./settings.ts";
import { Target } from "./target.ts";
import { generateFragment } from "./text/fragment.ts";
import {
  mangledWords,
  phoneticWords,
  randomWords,
  uniqueWords,
} from "./text/words.ts";

// New letters with fewer than this many samples must also pass the
// minAccuracy floor before they are unlocked.
const NEW_KEY_SAMPLE_THRESHOLD = 5;

export class GuidedLesson extends Lesson {
  readonly dictionary: Dictionary;

  constructor(
    settings: Settings,
    keyboard: Keyboard,
    model: PhoneticModel,
    wordList: WordList,
  ) {
    super(settings, keyboard, model);
    this.dictionary = new Dictionary(
      filterWordList(wordList, this.codePoints).filter(
        (word) => word.length > 2,
      ),
    );
  }

  override get letters() {
    return this.model.letters;
  }

  override update(keyStatsMap: KeyStatsMap) {
    const alphabetSize = this.settings.get(lessonProps.guided.alphabetSize);
    const recoverKeys = this.settings.get(lessonProps.guided.recoverKeys);
    const minAccuracy = this.settings.get(lessonProps.guided.minAccuracy);

    const letters = this.#getLetters();

    const minSize = 6;
    const maxSize =
      minSize + Math.round((letters.length - minSize) * alphabetSize);

    const target = new Target(this.settings);

    const lessonKeys = new LessonKeys(
      letters.map((letter) => LessonKey.from(keyStatsMap.get(letter), target)),
    );

    for (const lessonKey of lessonKeys) {
      const includedKeys = lessonKeys.findIncludedKeys();

      if (includedKeys.length < minSize) {
        // Meet the minimal required alphabet size.
        lessonKeys.include(lessonKey.letter);
        continue;
      }

      if (includedKeys.length < maxSize) {
        // Meet the maximal required alphabet size.
        lessonKeys.force(lessonKey.letter);
        continue;
      }

      if ((lessonKey.bestConfidence ?? 0) >= 1) {
        // Must include all confident keys.
        // Note: established keys (bestConfidence ever ≥ 1) are NOT relocked
        // by the accuracy floor — that would disrupt existing users.
        lessonKeys.include(lessonKey.letter);
        continue;
      }

      // Accuracy gate: only applied to keys with few samples (i.e. newly
      // unlocked candidates), so already-confident-but-inaccurate letters
      // from before this gate existed are grandfathered.
      const meetsAccuracy = passesAccuracyFloor(lessonKey.samples, minAccuracy);

      if (recoverKeys) {
        if (
          includedKeys.every((key) => (key.confidence ?? 0) >= 1) &&
          meetsAccuracy
        ) {
          // Include a new key only when all the previous keys
          // are now above the target speed AND this key meets accuracy.
          lessonKeys.include(lessonKey.letter);
          continue;
        }
      } else {
        if (
          includedKeys.every((key) => (key.bestConfidence ?? 0) >= 1) &&
          meetsAccuracy
        ) {
          // Include a new key only when all the previous keys
          // were once above the target speed AND this key meets accuracy.
          lessonKeys.include(lessonKey.letter);
          continue;
        }
      }
    }

    // Find the least confident of all included keys and focus on it.
    const confidenceOf = (key: LessonKey): number => {
      return recoverKeys ? (key.confidence ?? 0) : (key.bestConfidence ?? 0);
    };
    const weakestKeys = lessonKeys
      .findIncludedKeys()
      .filter((key) => confidenceOf(key) < 1)
      .sort((a, b) => confidenceOf(a) - confidenceOf(b));
    if (weakestKeys.length > 0) {
      lessonKeys.focus(weakestKeys[0].letter);
    }

    return lessonKeys;
  }

  override generate(lessonKeys: LessonKeys, rng: RNGStream) {
    const filter = new Filter(
      lessonKeys.findIncludedKeys(),
      lessonKeys.findFocusedKey(),
    );
    const wordGenerator = this.#makeWordGenerator(filter, rng);
    const words = mangledWords(
      uniqueWords(wordGenerator),
      this.model.language,
      Letter.restrict(Letter.punctuators, this.codePoints),
      {
        withCapitals: this.settings.get(lessonProps.capitals),
        withPunctuators: this.settings.get(lessonProps.punctuators),
      },
      rng,
    );
    return generateFragment(this.settings, words, {
      repeatWords: this.settings.get(lessonProps.repeatWords),
    });
  }

  #getLetters() {
    const { letters } = this.model;
    const { codePoints } = this;
    if (this.settings.get(lessonProps.guided.keyboardOrder)) {
      return Letter.weightedFrequencyOrder(letters, ({ codePoint }) =>
        codePoints.weight(codePoint),
      );
    } else {
      return Letter.frequencyOrder(letters);
    }
  }

  #makeWordGenerator(filter: Filter, rng: RNGStream) {
    const pseudoWords = phoneticWords(this.model, filter, rng);
    if (this.settings.get(lessonProps.guided.naturalWords)) {
      const words = this.dictionary.find(filter).slice(0, 1000);
      while (words.length < 15) {
        const word = pseudoWords();
        if (word != null) {
          words.push(word);
        } else {
          break;
        }
      }
      if (words.length === 0) {
        words.push("?");
      }
      return randomWords(words, rng);
    }
    return pseudoWords;
  }
}

/**
 * Return true when the key passes the accuracy floor — meaning either
 * (a) it has enough history that it's no longer "newly considered"
 * (grandfathered), or (b) its recent miss rate is at or below
 * `1 - minAccuracy`.
 *
 * Pass minAccuracy = 0 to disable the floor entirely.
 */
function passesAccuracyFloor(
  samples: readonly KeySample[],
  minAccuracy: number,
): boolean {
  if (minAccuracy <= 0) return true;
  if (samples.length >= NEW_KEY_SAMPLE_THRESHOLD) return true;
  if (samples.length === 0) return true; // no data; defer to speed gate

  let hits = 0;
  let misses = 0;
  for (const s of samples) {
    hits += s.hitCount;
    misses += s.missCount;
  }
  const total = hits + misses;
  if (total === 0) return true;
  const missRate = misses / total;
  return missRate <= 1 - minAccuracy;
}
