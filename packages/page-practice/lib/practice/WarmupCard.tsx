import { lessonProps } from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import { emit } from "@keybr/telemetry";
import { type ReactNode, useEffect, useRef, useState } from "react";
import * as styles from "./WarmupCard.module.less";

// High-frequency English bigrams from Norvig's Mayzner-revisited table.
// These are the pairs the user's fingers should pre-warm on.
const WARMUP_BIGRAMS = [
  "th",
  "he",
  "in",
  "er",
  "an",
  "re",
  "on",
  "at",
  "en",
  "nd",
];

const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Optional pre-session warmup drill. Renders only when
 * lesson.warmupSeconds > 0 AND the user hasn't dismissed it this sitting.
 *
 * Visual stages:
 *  - Pre-flight (no keystroke yet): large inviting card, big monospace
 *    target, no countdown. The user is being asked to begin.
 *  - In progress (after first keystroke OR when `minimized` is set):
 *    collapses to a small pill containing a circular countdown ring
 *    and a "skip warm-up" affordance. The pill stays out of the way
 *    so the user can focus on typing.
 *  - Complete or dismissed: nothing rendered.
 *
 * The countdown ring is a tiny inline SVG driven by the
 * `lesson.warmupSeconds` setting; we tick it down at 100ms granularity
 * once typing begins.
 *
 * Optional props let the Presenter override the auto-detected stage —
 * useful for tests, tour mode, or other layouts that want to force the
 * minimized view.
 */
export function WarmupCard({
  minimized: minimizedProp,
}: {
  /**
   * Force the minimized "skip pill" presentation. When undefined the
   * card auto-minimizes after the user produces a keystroke.
   */
  readonly minimized?: boolean;
} = {}): ReactNode {
  const { settings } = useSettings();
  const seconds = settings.get(lessonProps.warmupSeconds);
  const [dismissed, setDismissed] = useState(false);
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [remainingMs, setRemainingMs] = useState(() => seconds * 1000);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset the countdown whenever the underlying setting changes (e.g. a
  // settings popup re-opens). Cheap and avoids stale displays.
  useEffect(() => {
    setRemainingMs(seconds * 1000);
  }, [seconds]);

  // Tick the countdown only after typing has actually started.
  useEffect(() => {
    if (!started || dismissed) return;
    intervalRef.current = setInterval(() => {
      setRemainingMs((ms) => Math.max(0, ms - 100));
    }, 100);
    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [started, dismissed]);

  if (seconds <= 0 || dismissed) return null;

  const targetText = WARMUP_BIGRAMS.join(" ");
  const matched = countMatchedPrefix(typed, targetText);
  const isComplete = matched >= targetText.length;
  const isTimedOut = started && remainingMs <= 0;

  if (isComplete || isTimedOut) {
    // We let the parent decide whether to keep the slot mounted, but
    // visually we vanish.
    return null;
  }

  const minimized = minimizedProp ?? started;
  const fraction =
    seconds > 0 ? Math.max(0, Math.min(1, remainingMs / (seconds * 1000))) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  if (minimized) {
    return (
      <div className={styles.pill} role="status" aria-live="polite">
        <CountdownRing dashOffset={dashOffset} />
        <span className={styles.pillLabel}>
          Warm-up &middot; {remainingSeconds}s
        </span>
        <button
          type="button"
          className={styles.pillSkip}
          onClick={() => setDismissed(true)}
        >
          Skip
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card} role="region" aria-label="Warm-up">
      <div className={styles.heading}>Warm-up</div>
      <div className={styles.subheading}>
        Loosen your fingers with the most common English bigrams. Type along —
        or press Esc to skip straight into practice.
      </div>
      <div className={styles.target}>
        <span className={styles.typed}>{targetText.slice(0, matched)}</span>
        <span className={styles.untyped}>{targetText.slice(matched)}</span>
      </div>
      <input
        type="text"
        value={typed}
        autoFocus={true}
        className={styles.input}
        onChange={(e) => {
          const v = e.currentTarget.value;
          setTyped(v);
          if (!started && v.length > 0) {
            setStarted(true);
          }
          if (
            countMatchedPrefix(v, targetText) >= targetText.length &&
            !isComplete
          ) {
            emit({
              type: "warmup_completed",
              bigramCount: WARMUP_BIGRAMS.length,
            });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDismissed(true);
          }
        }}
        placeholder="Type to begin · Esc to skip"
      />
      <div className={styles.footer}>
        <span className={styles.hint}>
          {seconds}-second timer starts on first keystroke
        </span>
        <button
          type="button"
          className={styles.skip}
          onClick={() => setDismissed(true)}
        >
          Skip warm-up
        </button>
      </div>
    </div>
  );
}

function CountdownRing({
  dashOffset,
}: {
  readonly dashOffset: number;
}): ReactNode {
  return (
    <svg
      className={styles.ring}
      viewBox="0 0 32 32"
      width={20}
      height={20}
      aria-hidden="true"
    >
      <circle
        className={styles.ringTrack}
        cx={16}
        cy={16}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={3}
      />
      <circle
        className={styles.ringProgress}
        cx={16}
        cy={16}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={3}
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 16 16)"
      />
    </svg>
  );
}

function countMatchedPrefix(typed: string, target: string): number {
  let i = 0;
  while (i < typed.length && i < target.length && typed[i] === target[i]) {
    i += 1;
  }
  return i;
}
