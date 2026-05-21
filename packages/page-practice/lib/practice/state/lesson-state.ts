import { keyboardProps, type KeyId } from "@keybr/keyboard";
import {
  type DailyGoal,
  Lesson,
  type LessonKeys,
  lessonProps,
} from "@keybr/lesson";
import {
  type KeyStatsMap,
  Result,
  type StreakList,
  type SummaryStats,
} from "@keybr/result";
import { type Settings } from "@keybr/settings";
import {
  type Feedback,
  type LineList,
  makeStats,
  type StyledText,
  type TextDisplaySettings,
  TextInput,
  type TextInputSettings,
  toTextDisplaySettings,
  toTextInputSettings,
} from "@keybr/textinput";
import { type DwellMeter, type IInputEvent } from "@keybr/textinput-events";
import { type CodePoint } from "@keybr/unicode";
import { type LastLesson } from "./last-lesson.ts";
import { type Progress } from "./progress.ts";

export class LessonState {
  readonly #onResult: (result: Result, textInput: TextInput) => void;
  readonly #dwellMeter: DwellMeter | null;
  readonly settings: Settings;
  readonly lesson: Lesson;
  readonly textInputSettings: TextInputSettings;
  readonly textDisplaySettings: TextDisplaySettings;
  readonly keyStatsMap: KeyStatsMap;
  readonly summaryStats: SummaryStats;
  readonly streakList: StreakList;
  readonly dailyGoal: DailyGoal;
  readonly lessonKeys: LessonKeys;

  lastLesson: LastLesson | null = null;

  textInput!: TextInput; // Mutable.
  lines!: LineList; // Mutable.
  suffix!: readonly CodePoint[]; // Mutable.
  depressedKeys: readonly KeyId[] = []; // Mutable.

  constructor(
    progress: Progress,
    onResult: (result: Result, textInput: TextInput) => void,
    dwellMeter: DwellMeter | null = null,
  ) {
    this.#onResult = onResult;
    this.#dwellMeter = dwellMeter;
    this.settings = progress.settings;
    this.lesson = progress.lesson;
    this.textInputSettings = toTextInputSettings(this.settings);
    this.textDisplaySettings = toTextDisplaySettings(this.settings);
    this.keyStatsMap = progress.keyStatsMap.copy();
    this.summaryStats = progress.summaryStats.copy();
    this.streakList = progress.streakList.copy();
    this.dailyGoal = progress.dailyGoal.copy();
    this.lessonKeys = this.lesson.update(this.keyStatsMap);
    this.#reset(this.lesson.generate(this.lessonKeys, Lesson.rng));
  }

  resetLesson() {
    this.#reset(this.textInput.text);
  }

  skipLesson() {
    this.#reset(this.lesson.generate(this.lessonKeys, Lesson.rng));
  }

  onInput(event: IInputEvent): Feedback {
    const feedback = this.textInput.onInput(event);
    this.lines = this.textInput.lines;
    this.suffix = this.textInput.remaining.map(({ codePoint }) => codePoint);
    if (this.textInput.completed) {
      this.#onResult(this.#makeResult(), this.textInput);
    }
    return feedback;
  }

  #reset(fragment: StyledText) {
    this.textInput = new TextInput(fragment, this.textInputSettings);
    this.lines = this.textInput.lines;
    this.suffix = this.textInput.remaining.map(({ codePoint }) => codePoint);
  }

  #makeResult(timeStamp = Date.now()) {
    return Result.fromStats(
      this.settings.get(keyboardProps.layout),
      this.settings.get(lessonProps.type).textType,
      timeStamp,
      makeStats(this.textInput.steps),
    );
  }

  /**
   * Current key-dwell median in ms (rolling) — null when the meter has not
   * yet collected enough samples. Validated proxy for typing force /
   * forearm tension (PubMed 22897644).
   */
  get currentDwellMs(): number | null {
    return this.#dwellMeter?.currentMedianMs ?? null;
  }

  /**
   * Ratio of current dwell median to the user's personal baseline.
   * Values noticeably greater than 1 indicate elevated typing tension.
   */
  get tensionRatio(): number | null {
    return this.#dwellMeter?.tensionRatio ?? null;
  }

  /**
   * Personal cadence baseline: the median inter-key-interval observed across
   * the last 60 keystrokes (~half a typical lesson). Null when too few
   * samples to be meaningful. Used as the comparison point for the rhythm
   * coach's "you're accelerating beyond your stable pace" detection.
   */
  get cadenceBaselineMs(): number | null {
    const steps = this.textInput.steps;
    if (steps.length < 12) return null;
    const window = steps.slice(-60);
    const valid: number[] = [];
    for (const s of window) {
      if (s.timeToType > 0 && s.timeToType < 2000) {
        valid.push(s.timeToType);
      }
    }
    if (valid.length < 8) return null;
    const sorted = valid.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  /**
   * Z-score-like deviation of the most recent IKI from the cadence baseline,
   * scaled by IQR. Positive = recent strokes faster than baseline (rhythm
   * accelerating, pre-error risk per Steinborn 2021); negative = slower.
   * Null when insufficient data.
   */
  get cadenceDeviation(): number | null {
    const steps = this.textInput.steps;
    if (steps.length < 12) return null;
    const baseline = this.cadenceBaselineMs;
    if (baseline == null) return null;
    const recent = steps.slice(-5);
    let sum = 0;
    let n = 0;
    for (const s of recent) {
      if (s.timeToType > 0 && s.timeToType < 2000) {
        sum += s.timeToType;
        n += 1;
      }
    }
    if (n === 0) return null;
    const currentMean = sum / n;
    // Positive when current is *faster* (smaller IKI). Bounded to [-1, 1].
    const delta = (baseline - currentMean) / baseline;
    return Math.max(-1, Math.min(1, delta));
  }

  /**
   * Current typing speed in characters per minute, computed from the
   * rolling window of the last 10 typed characters. Returns null when
   * there are fewer than 5 steps (signal too noisy to display).
   */
  get currentSpeed(): number | null {
    const steps = this.textInput.steps;
    if (steps.length < 5) return null;
    const windowSize = 10;
    const window = steps.slice(-windowSize);
    let totalTime = 0;
    let count = 0;
    for (const s of window) {
      if (s.timeToType > 0) {
        totalTime += s.timeToType;
        count += 1;
      }
    }
    if (count === 0 || totalTime === 0) return null;
    // CPM = chars per minute. timeToType is ms per char.
    return Math.round((count / totalTime) * 60_000);
  }
}
