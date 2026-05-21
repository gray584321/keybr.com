import { lessonProps } from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import { emit } from "@keybr/telemetry";
import { type ReactNode, useState } from "react";
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

/**
 * Optional pre-session warmup drill. Renders only when
 * lesson.warmupSeconds > 0 AND the user hasn't dismissed it this sitting.
 *
 * The drill text is a sequence of common bigrams typed into a separate
 * input — completing it (or letting the timer run out) collapses the
 * card and lets the real practice session begin.
 */
export function WarmupCard(): ReactNode {
  const { settings } = useSettings();
  const seconds = settings.get(lessonProps.warmupSeconds);
  const [dismissed, setDismissed] = useState(false);
  const [typed, setTyped] = useState("");
  if (seconds <= 0 || dismissed) return null;

  const targetText = WARMUP_BIGRAMS.join(" ");
  const matched = countMatchedPrefix(typed, targetText);
  const isComplete = matched >= targetText.length;

  return (
    <div className={styles.card}>
      <div className={styles.heading}>Warm-up — {seconds}s</div>
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
        placeholder="Type the bigrams above to warm up, or press Esc to skip"
      />
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.skip}
          onClick={() => setDismissed(true)}
        >
          {isComplete ? "Ready" : "Skip warm-up"}
        </button>
      </div>
    </div>
  );
}

function countMatchedPrefix(typed: string, target: string): number {
  let i = 0;
  while (i < typed.length && i < target.length && typed[i] === target[i]) {
    i += 1;
  }
  return i;
}
