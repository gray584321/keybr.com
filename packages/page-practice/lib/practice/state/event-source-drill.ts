import { lessonProps } from "@keybr/lesson";
import { type Result } from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { emit } from "@keybr/telemetry";
import {
  type LessonEventListener,
  type LessonEventSource,
} from "./event-types.ts";

/**
 * When `lesson.shortDrillMinutes` is set, accumulates per-lesson typing
 * time and emits a single "drill-complete" event once the limit is hit.
 * Disabled when the setting is 0 (the default).
 */
export class DrillEvents implements LessonEventSource {
  readonly #limitMs: number;
  #sessionMs: number;
  #fired: boolean;

  constructor(settings: Settings) {
    const minutes = settings.get(lessonProps.shortDrillMinutes);
    this.#limitMs = minutes > 0 ? minutes * 60_000 : 0;
    this.#sessionMs = 0;
    this.#fired = false;
  }

  append(result: Result, listener: LessonEventListener): void {
    if (this.#limitMs <= 0 || this.#fired) return;
    this.#sessionMs += result.time;
    if (this.#sessionMs >= this.#limitMs) {
      this.#fired = true;
      const sessionMinutes = Math.round(this.#sessionMs / 60_000);
      listener({ type: "drill-complete", sessionMinutes });
      emit({ type: "drill_complete", sessionMinutes });
    }
  }
}
