import { Syntax } from "@keybr/code";
import { Book } from "@keybr/content";
import {
  booleanProp,
  flagsProp,
  itemProp,
  numberProp,
  stringProp,
} from "@keybr/settings";
import { LessonType } from "./lessontype.ts";

export const lessonProps = {
  type: itemProp("lesson.type", LessonType.ALL, LessonType.GUIDED),
  length: numberProp("lesson.length", 0, { min: 0, max: 1 }),
  guided: {
    naturalWords: booleanProp("lesson.guided.naturalWords", true),
    keyboardOrder: booleanProp("lesson.guided.keyboardOrder", false),
    alphabetSize: numberProp("lesson.guided.alphabetSize", 0, {
      min: 0,
      max: 1,
    }),
    recoverKeys: booleanProp("lesson.guided.recoverKeys", false),
    // New keys (samples.length < 5) require this minimum accuracy on their
    // recent samples to unlock, in addition to meeting the speed target.
    // 0 disables the floor entirely.
    minAccuracy: numberProp("lesson.guided.minAccuracy", 0.8, {
      min: 0,
      max: 1,
    }),
    // When true, randomly rotate the focus across the top-3 weakest
    // included keys each lesson instead of always picking the single
    // weakest. Contextual-interference literature shows interleaving
    // improves retention over blocked drilling.
    multiFocus: booleanProp("lesson.guided.multiFocus", false),
  } as const,
  wordList: {
    wordListSize: numberProp("lesson.wordList.wordListSize", 1000, {
      min: 10,
      max: 1000,
    }),
    longWordsOnly: booleanProp("lesson.wordList.longWordsOnly", false),
  } as const,
  books: {
    book: itemProp("lesson.books.book", Book.ALL, Book.EN_ALICE_WONDERLAND),
    paragraphIndex: numberProp("lesson.books.paragraphIndex", 0, {
      min: 0,
      max: 1000,
    }),
    lettersOnly: booleanProp("lesson.books.lettersOnly", false),
    lowercase: booleanProp("lesson.books.lowercase", false),
  },
  customText: {
    content: stringProp(
      "lesson.customText.content",
      "The quick brown fox jumps over the lazy dog.",
      { maxLength: 10_000 },
    ),
    lettersOnly: booleanProp("lesson.customText.lettersOnly", true),
    lowercase: booleanProp("lesson.customText.lowercase", true),
    randomize: booleanProp("lesson.customText.randomize", false),
  } as const,
  numbers: {
    benford: booleanProp("lesson.numbers.benford", true),
  } as const,
  code: {
    syntax: itemProp("lesson.code.syntax", Syntax.ALL, Syntax.HTML),
    flags: flagsProp("lesson.code.flags", Syntax.FLAGS),
  } as const,
  bigram: {
    // "any" | "every" | "exclude" — see BigramFilter.
    focusMode: stringProp("lesson.bigram.focusMode", "any", { maxLength: 16 }),
    // "slowest" | "manual" | "same-finger" | "common" — see BigramLesson.
    targetBigramMode: stringProp("lesson.bigram.targetBigramMode", "common", {
      maxLength: 16,
    }),
    minBigrams: numberProp("lesson.bigram.minBigrams", 0, { min: 0, max: 10 }),
    maxBigrams: numberProp("lesson.bigram.maxBigrams", 2, { min: 0, max: 20 }),
    // Comma-separated list of bigrams used when targetBigramMode is "manual".
    manualBigrams: stringProp("lesson.bigram.manualBigrams", "", {
      maxLength: 200,
    }),
  } as const,
  capitals: numberProp("lesson.capitals", 0, { min: 0, max: 1 }),
  punctuators: numberProp("lesson.punctuators", 0, { min: 0, max: 1 }),
  repeatWords: numberProp("lesson.repeatWords", 1, { min: 1, max: 10 }),
  // Default lowered from 175 → 120 CPM (≈24 WPM) to address beginner drop-off.
  // Existing users keep their stored value via numberProp.fromJson.
  targetSpeed: numberProp("lesson.targetSpeed", 120, { min: 75, max: 750 }),
  dailyGoal: numberProp("lesson.dailyGoal", 30, { min: 0, max: 120 }),
  // When > 0, lessons are sized to fit roughly this many minutes of typing
  // and the practice loop ends the session early once the total active
  // typing time reaches the limit. 0 disables the cap (default behavior).
  shortDrillMinutes: numberProp("lesson.shortDrillMinutes", 0, {
    min: 0,
    max: 60,
  }),
  // Reserved for the days-in-a-row streak freeze feature. Counts tokens the
  // user may spend to preserve a streak through a missed day. The streak
  // engine itself is not yet implemented; this prop is added now so settings
  // schema changes don't break existing users when it is.
  streakFreezeTokens: numberProp("lesson.streakFreezeTokens", 0, {
    min: 0,
    max: 5,
  }),
  // When > 0, the practice screen offers a brief warm-up drill of high-
  // frequency bigrams before the user's first session of the day.
  warmupSeconds: numberProp("lesson.warmupSeconds", 0, { min: 0, max: 120 }),
  // Multiplier applied to targetSpeed for the plateau-breaker overspeed
  // drill (deliberate practice / overspeed-burst literature). 1.15 = 15%
  // above comfortable pace, the practitioner-consensus sweet spot.
  plateauDrillSpeedMultiplier: numberProp(
    "lesson.plateauDrillSpeedMultiplier",
    1.15,
    { min: 1.0, max: 1.5 },
  ),
  // Real-time rhythm coach: a visual pacer that pulses at the user's
  // personal cadence baseline. Steinborn 2021 (PMC 8863758) showed
  // pre-error rhythm acceleration is detectable from IKI variance.
  rhythmPacerEnabled: booleanProp("lesson.rhythmPacerEnabled", false),
} as const;
