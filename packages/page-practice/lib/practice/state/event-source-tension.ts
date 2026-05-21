import { type Result } from "@keybr/result";
import { emit } from "@keybr/telemetry";
import {
  type LessonEventListener,
  type LessonEventSource,
} from "./event-types.ts";

const TENSION_RATIO_THRESHOLD = 1.2; // >20% above personal baseline
const ERROR_RATE_THRESHOLD = 0.05; // >5% errors in the same lesson
const TOAST_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h between tension toasts

/**
 * Emits a "tension" event when the user's dwell-time median is elevated
 * above their personal baseline *and* the same lesson has an unusually
 * high error rate — the dual condition is what distinguishes "typing
 * confidently faster" from "gripping the keys under stress."
 */
export class TensionEvents implements LessonEventSource {
  readonly #getTensionRatio: () => number | null;
  #lastToastAt = 0;

  constructor(getTensionRatio: () => number | null) {
    this.#getTensionRatio = getTensionRatio;
  }

  append(result: Result, listener: LessonEventListener): void {
    const ratio = this.#getTensionRatio();
    if (ratio == null || ratio < TENSION_RATIO_THRESHOLD) return;
    const errorRate = 1 - result.accuracy;
    if (errorRate < ERROR_RATE_THRESHOLD) return;
    const now = result.timeStamp;
    if (now - this.#lastToastAt < TOAST_COOLDOWN_MS) return;
    this.#lastToastAt = now;
    listener({ type: "tension", tensionRatio: ratio });
    emit({ type: "tension_detected", tensionRatio: ratio });
  }
}
