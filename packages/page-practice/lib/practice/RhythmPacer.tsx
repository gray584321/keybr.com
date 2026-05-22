import { lessonProps } from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import { type CSSProperties, type ReactNode } from "react";
import * as styles from "./RhythmPacer.module.less";

/**
 * Real-time rhythm coach: a tiny drifting dot that sits beside the
 * text cursor and pulses at the user's personal cadence baseline.
 * When recent IKIs accelerate meaningfully past baseline
 * (rhythm-runaway, the leading indicator of an imminent error per
 * Steinborn 2021), the dot dims as a non-intrusive "you're outrunning
 * yourself" cue.
 *
 * Renders nothing when the setting is off or the cadence baseline
 * isn't yet established (too few steps in the current lesson).
 *
 * The component is purely visual: positioning is decided by the
 * caller. By default it floats at the top-right of its containing
 * block via the `floating` class. Pass `position="inline"` to make it
 * a relative-flow element (e.g. inline beside other indicators).
 * Use the `style` prop to override placement when an absolute pixel
 * offset is needed.
 */
export function RhythmPacer({
  baselineMs,
  deviation,
  position = "floating",
  style,
}: {
  /** Personal cadence baseline in ms, or null when unavailable. */
  readonly baselineMs: number | null;
  /** Cadence deviation in [-1, 1]: positive = faster than baseline. */
  readonly deviation: number | null;
  /**
   * Where the dot lives in the layout. `"floating"` (default) pins it
   * to the top-right of its positioned ancestor; `"inline"` lets the
   * caller place it via normal flow.
   */
  readonly position?: "floating" | "inline";
  /** Optional inline style overrides (used to tweak placement). */
  readonly style?: CSSProperties;
}): ReactNode {
  const { settings } = useSettings();
  if (!settings.get(lessonProps.rhythmPacerEnabled)) return null;
  if (baselineMs == null) return null;

  const period = Math.max(60, Math.min(800, baselineMs));
  const dimmed = (deviation ?? 0) > 0.2;
  const label = dimmed ? "ease off" : "steady";

  const containerClass =
    position === "inline" ? styles.inline : styles.floating;

  return (
    <div
      className={containerClass}
      style={style}
      aria-hidden="true"
      data-state={dimmed ? "fast" : "steady"}
    >
      <div
        className={dimmed ? styles.dotDimmed : styles.dot}
        style={{ animationDuration: `${period}ms` }}
      />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
