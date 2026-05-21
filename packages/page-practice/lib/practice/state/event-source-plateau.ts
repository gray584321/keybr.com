import { LearningRate, type LessonKeys, type Target } from "@keybr/lesson";
import { type Letter } from "@keybr/phonetic-model";
import { type KeyStats, type KeyStatsMap, type Result } from "@keybr/result";
import {
  type LessonEventListener,
  type LessonEventSource,
} from "./event-types.ts";

// Number of consecutive results on the same focus key with no measurable
// improvement before we surface a plateau toast. 5 ≈ one short practice run.
const STALL_THRESHOLD = 5;

// Minimum learning rate (CPM gained per lesson) considered "real progress".
// Below this threshold counts as a stall.
const STALL_LEARNING_RATE = 0.1;

// Toast cooldown — don't pester the user more than once per X ms.
const TOAST_COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72h

/**
 * Watches the focused letter across results. When it stays the same and
 * LearningRate.learningRate stays below STALL_LEARNING_RATE for
 * STALL_THRESHOLD consecutive results, emits a "plateau" event — at most
 * once per TOAST_COOLDOWN_MS.
 */
export class PlateauEvents implements LessonEventSource {
  readonly #keyStatsMap: KeyStatsMap;
  readonly #target: Target;
  readonly #getFocusedKey: () => Letter | null;
  #lastFocusedLetter: Letter | null = null;
  #consecutiveStalls = 0;
  #lastToastAt = 0;

  constructor(
    keyStatsMap: KeyStatsMap,
    target: Target,
    getFocusedKey: () => Letter | null,
  ) {
    this.#keyStatsMap = keyStatsMap;
    this.#target = target;
    this.#getFocusedKey = getFocusedKey;
  }

  append(result: Result, listener: LessonEventListener): void {
    const focused = this.#getFocusedKey();
    if (focused == null) {
      this.#lastFocusedLetter = null;
      this.#consecutiveStalls = 0;
      return;
    }

    if (focused !== this.#lastFocusedLetter) {
      // Focus changed — reset stall counter; the user is making progress
      // (or the system is rotating to a different weak key).
      this.#lastFocusedLetter = focused;
      this.#consecutiveStalls = 0;
      return;
    }

    const keyStats: KeyStats | undefined = this.#keyStatsMap.get(focused);
    if (keyStats == null) return;

    const rate = LearningRate.from(keyStats.samples, this.#target);
    if (rate == null || !Number.isFinite(rate.learningRate)) {
      this.#consecutiveStalls = 0;
      return;
    }

    if (rate.learningRate < STALL_LEARNING_RATE) {
      this.#consecutiveStalls += 1;
    } else {
      this.#consecutiveStalls = 0;
    }

    if (this.#consecutiveStalls >= STALL_THRESHOLD) {
      const now = result.timeStamp;
      if (now - this.#lastToastAt >= TOAST_COOLDOWN_MS) {
        this.#lastToastAt = now;
        this.#consecutiveStalls = 0;
        listener({ type: "plateau", letter: focused });
      }
    }
  }
}
