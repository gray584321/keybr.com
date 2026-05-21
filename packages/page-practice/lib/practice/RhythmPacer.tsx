import { lessonProps } from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import { type ReactNode } from "react";
import * as styles from "./RhythmPacer.module.less";

/**
 * Real-time rhythm coach: a thin dot below the text input that pulses at
 * the user's personal cadence baseline. When recent IKIs accelerate
 * meaningfully past baseline (rhythm-runaway, the leading indicator of
 * an imminent error per Steinborn 2021), the dot dims as a non-intrusive
 * "you're outrunning yourself" cue.
 *
 * Renders nothing when the setting is off or the cadence baseline isn't
 * yet established (too few steps in the current lesson).
 */
export function RhythmPacer({
  baselineMs,
  deviation,
}: {
  /** Personal cadence baseline in ms, or null when unavailable. */
  readonly baselineMs: number | null;
  /** Cadence deviation in [-1, 1]: positive = faster than baseline. */
  readonly deviation: number | null;
}): ReactNode {
  const { settings } = useSettings();
  if (!settings.get(lessonProps.rhythmPacerEnabled)) return null;
  if (baselineMs == null) return null;

  const period = Math.max(60, Math.min(800, baselineMs));
  const dimmed = (deviation ?? 0) > 0.2;
  const label = dimmed ? "ease off" : "steady";

  return (
    <div className={styles.row} aria-hidden="true">
      <div
        className={dimmed ? styles.dotDimmed : styles.dot}
        style={{ animationDuration: `${period}ms` }}
      />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
