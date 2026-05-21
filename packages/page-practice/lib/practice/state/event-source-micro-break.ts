import { type Result } from "@keybr/result";
import {
  type LessonEventListener,
  type LessonEventSource,
} from "./event-types.ts";

/**
 * Emits a "micro-break" event after every `intervalMs` of accumulated
 * typing time within a single session. Uses `result.time` (active typing
 * time) rather than wall-clock so background tabs / long pauses between
 * lessons don't trip the threshold spuriously.
 *
 * Based on PubMed 11394463: 30-second microbreaks every 20 minutes
 * reduced perceived discomfort with no productivity loss.
 */
export class MicroBreakEvents implements LessonEventSource {
  readonly #intervalMs: number;
  #sessionMs: number;
  #lastBreakMs: number;

  constructor(intervalMs: number = 20 * 60 * 1000) {
    this.#intervalMs = intervalMs;
    this.#sessionMs = 0;
    this.#lastBreakMs = 0;
  }

  append(result: Result, listener: LessonEventListener): void {
    this.#sessionMs += result.time;
    if (this.#sessionMs - this.#lastBreakMs >= this.#intervalMs) {
      this.#lastBreakMs = this.#sessionMs;
      listener({
        type: "micro-break",
        sessionMinutes: Math.round(this.#sessionMs / 60000),
      });
    }
  }
}
