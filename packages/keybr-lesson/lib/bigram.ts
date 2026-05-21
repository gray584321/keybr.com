import { type Keyboard } from "@keybr/keyboard";
import { Filter, Letter, type PhoneticModel } from "@keybr/phonetic-model";
import { type RNGStream } from "@keybr/rand";
import { type BigramStatsMap, type KeyStatsMap } from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { type StyledText } from "@keybr/textinput";
import { type CodePoint } from "@keybr/unicode";
import { LessonKeys } from "./key.ts";
import { Lesson } from "./lesson.ts";
import { lessonProps } from "./settings.ts";
import { Target } from "./target.ts";
import {
  BigramFilter,
  type BigramFocusMode,
  COMMON_ENGLISH_BIGRAMS,
  QWERTY_SAME_FINGER_BIGRAMS,
} from "./text/bigramfilter.ts";
import { bigramWords } from "./text/bigramwords.ts";
import { generateFragment } from "./text/fragment.ts";
import { mangledWords, uniqueWords } from "./text/words.ts";

const FOCUS_MODES: readonly BigramFocusMode[] = ["any", "every", "exclude"];
type TargetBigramMode = "slowest" | "manual" | "same-finger" | "common";
const TARGET_BIGRAM_MODES: readonly TargetBigramMode[] = [
  "slowest",
  "manual",
  "same-finger",
  "common",
];

export class BigramLesson extends Lesson {
  private readonly bigramStatsMap: BigramStatsMap;

  constructor(
    settings: Settings,
    keyboard: Keyboard,
    model: PhoneticModel,
    bigramStatsMap: BigramStatsMap = new Map(),
  ) {
    super(settings, keyboard, model);
    this.bigramStatsMap = bigramStatsMap;
  }

  override get letters() {
    return this.model.letters;
  }

  override update(keyStatsMap: KeyStatsMap): LessonKeys {
    // BigramLesson is not gated on per-key unlock — it uses the full alphabet.
    return LessonKeys.includeAll(keyStatsMap, new Target(this.settings));
  }

  override generate(lessonKeys: LessonKeys, rng: RNGStream): StyledText {
    const targetBigrams = this.selectTargetBigrams();
    const focusMode = normalizeFocusMode(
      this.settings.get(lessonProps.bigram.focusMode),
    );

    const bigramFilter = new BigramFilter(targetBigrams, focusMode);

    // Build a BigramBoost from the target list: for "any"/"every" modes
    // the boost biases the generator toward producing these pairs; for
    // "exclude" mode we don't want them, so we pass no boost.
    const bigramBoost =
      focusMode === "exclude" ? null : buildBigramBoost(targetBigrams);

    const filter = new Filter(
      lessonKeys.findIncludedKeys(),
      lessonKeys.findFocusedKey(),
      bigramBoost,
    );

    const minBigrams = this.settings.get(lessonProps.bigram.minBigrams);
    const maxBigrams = this.settings.get(lessonProps.bigram.maxBigrams);

    const wordGenerator = bigramWords(this.model, bigramFilter, filter, rng, {
      minTargetBigrams: minBigrams,
      maxTargetBigrams: maxBigrams,
      maxAttempts: 10,
    });

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

  private selectTargetBigrams(): string[] {
    const mode = normalizeTargetBigramMode(
      this.settings.get(lessonProps.bigram.targetBigramMode),
    );
    switch (mode) {
      case "slowest":
        return this.findSlowestBigrams(10);
      case "manual":
        return this.getManualBigrams();
      case "same-finger":
        return this.findSameFingerBigrams();
      case "common":
      default:
        return [...COMMON_ENGLISH_BIGRAMS];
    }
  }

  private findSlowestBigrams(count: number): string[] {
    // Thompson-sampling-style exploration: instead of picking the top-N
    // deterministically by ratio, we score each candidate as
    //   ratio + exploration_bonus
    // where the bonus is proportional to 1 / sqrt(hitCount + 1) so bigrams
    // with very few samples occasionally rotate into the focus set even
    // when their measured ratio is low. The bonus shrinks toward zero as
    // hitCount grows, so confirmed weaknesses still dominate at scale.
    //
    // This is the lightweight Thompson-sampling layer described in the
    // adaptive-algorithms research: combines a known weakness signal with
    // principled exploration of the unknown.
    const entries = [...this.bigramStatsMap.entries()].filter(
      ([, stats]) => stats.bestTimeToType != null && stats.hitCount > 0,
    );
    if (entries.length === 0) return [...COMMON_ENGLISH_BIGRAMS];

    const sampled = entries
      .map(([bigram, stats]) => {
        const ratio =
          stats.timeToType != null
            ? stats.timeToType / stats.bestTimeToType!
            : 1;
        // Normal-ish noise scaled by 1/sqrt(hitCount + 1).
        const exploration =
          (Math.random() - 0.5) / Math.sqrt(stats.hitCount + 1);
        return { bigram, score: ratio + exploration };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((e) => e.bigram);

    return sampled.length > 0 ? sampled : [...COMMON_ENGLISH_BIGRAMS];
  }

  private getManualBigrams(): string[] {
    const raw = this.settings.get(lessonProps.bigram.manualBigrams);
    const parsed = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length === 2);
    return parsed.length > 0 ? parsed : [...COMMON_ENGLISH_BIGRAMS.slice(0, 5)];
  }

  private findSameFingerBigrams(): string[] {
    // Find same-finger bigrams the user has actually typed (so we have stats
    // to track improvement). Fall back to a hardcoded QWERTY list when the
    // user has no data yet.
    const sameFingerPairs: string[] = [];
    for (const [bigram] of this.bigramStatsMap) {
      if (bigram.length !== 2) continue;
      if (this.isSameFinger(bigram.charCodeAt(0), bigram.charCodeAt(1))) {
        sameFingerPairs.push(bigram);
      }
    }
    return sameFingerPairs.length > 0
      ? sameFingerPairs
      : [...QWERTY_SAME_FINGER_BIGRAMS];
  }

  private isSameFinger(cp1: CodePoint, cp2: CodePoint): boolean {
    const combo1 = this.keyboard.getCombo(cp1);
    const combo2 = this.keyboard.getCombo(cp2);
    if (combo1 == null || combo2 == null) return false;
    const shape1 = this.keyboard.getShape(combo1.id);
    const shape2 = this.keyboard.getShape(combo2.id);
    return (
      shape1 != null &&
      shape2 != null &&
      shape1.finger != null &&
      shape1.finger === shape2.finger
    );
  }
}

function normalizeFocusMode(value: string): BigramFocusMode {
  return FOCUS_MODES.includes(value as BigramFocusMode)
    ? (value as BigramFocusMode)
    : "any";
}

function normalizeTargetBigramMode(value: string): TargetBigramMode {
  return TARGET_BIGRAM_MODES.includes(value as TargetBigramMode)
    ? (value as TargetBigramMode)
    : "common";
}

/**
 * Convert a list of two-character bigrams into a BigramBoost map suitable
 * for `Filter`. Default multiplier of 4× — high enough to meaningfully
 * shift the sampling distribution, low enough to keep generated text
 * looking natural.
 */
function buildBigramBoost(
  bigrams: readonly string[],
): Map<CodePoint, Map<CodePoint, number>> {
  const boost = new Map<CodePoint, Map<CodePoint, number>>();
  for (const pair of bigrams) {
    if (pair.length !== 2) continue;
    const first = pair.charCodeAt(0);
    const second = pair.charCodeAt(1);
    let row = boost.get(first);
    if (row == null) {
      row = new Map();
      boost.set(first, row);
    }
    row.set(second, 4);
  }
  return boost;
}
