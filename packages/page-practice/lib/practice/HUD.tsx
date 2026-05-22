import { useIntlDurations, useIntlNumbers } from "@keybr/intl";
import { useFormatter } from "@keybr/lesson-ui";
import { memo, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import * as styles from "./HUD.module.less";
import { type LessonState } from "./state/index.ts";

/**
 * Top HUD strip for the Focus Mode practice layout. Displays four prominent
 * metrics: live speed, accuracy, score, and the daily-goal progress pill.
 *
 * Reads data from the same `LessonState` that `Indicators` consumes — live
 * speed via `state.currentSpeed`, headline numbers via `state.summaryStats`
 * (speed/accuracy/score) and `state.dailyGoal`. The component is memo'd on
 * the `state` reference (a fresh object per re-render in Presenter) plus
 * the explicit `liveSpeed` prop — mirroring the pattern used by Indicators.
 */
export const HUD = memo(function HUD({
  state,
  liveSpeed = null,
}: {
  readonly state: LessonState;
  /**
   * Current typing speed in CPM, passed from the parent on every keystroke.
   * Memo-friendly explicit prop, same pattern as `Indicators`.
   */
  readonly liveSpeed?: number | null;
}): ReactNode {
  const { formatMessage } = useIntl();
  const { formatPercents, formatNumber } = useIntlNumbers();
  const { formatDuration } = useIntlDurations();
  const { formatSpeed, speedUnitName } = useFormatter();
  const { summaryStats, dailyGoal } = state;

  const speedValue =
    liveSpeed != null
      ? formatSpeed(liveSpeed, { unit: false })
      : summaryStats.count > 0
        ? formatSpeed(summaryStats.speed.last, { unit: false })
        : "—";
  const speedDelta = summaryStats.speed.delta;

  const accuracyValue =
    summaryStats.count > 0
      ? formatPercents(summaryStats.accuracy.last, 0)
      : "—";
  const accuracyDelta = summaryStats.accuracy.delta;

  const scoreValue =
    summaryStats.count > 0 ? formatNumber(summaryStats.score.last, 0) : "—";
  const scoreDelta = summaryStats.score.delta;

  return (
    <div
      className={styles.hud}
      role="group"
      aria-label={formatMessage({
        id: "t_PracticeHUD_groupLabel",
        defaultMessage: "Practice metrics",
      })}
    >
      <Stat
        label={
          <FormattedMessage
            id="t_PracticeHUD_speedLabel"
            defaultMessage="Speed"
          />
        }
        value={speedValue}
        unit={speedUnitName}
        delta={speedDelta}
        deltaFormatter={(v) => formatSpeed(v, { unit: false })}
        live={liveSpeed != null}
      />
      <Separator />
      <Stat
        label={
          <FormattedMessage
            id="t_PracticeHUD_accuracyLabel"
            defaultMessage="Accuracy"
          />
        }
        value={accuracyValue}
        delta={accuracyDelta}
        deltaFormatter={(v) => formatPercents(v, 0)}
      />
      <Separator />
      <Stat
        label={
          <FormattedMessage
            id="t_PracticeHUD_scoreLabel"
            defaultMessage="Score"
          />
        }
        value={scoreValue}
        delta={scoreDelta}
        deltaFormatter={(v) => formatNumber(v, 0)}
      />
      <Separator />
      <DailyGoalPill
        value={dailyGoal.value}
        goal={dailyGoal.goal}
        label={
          <FormattedMessage
            id="t_PracticeHUD_dailyGoalLabel"
            defaultMessage="Daily goal"
          />
        }
        formattedTime={
          dailyGoal.goal > 0 ? formatDuration({ minutes: dailyGoal.goal }) : ""
        }
      />
    </div>
  );
});

function Stat({
  label,
  value,
  unit,
  delta,
  deltaFormatter,
  live = false,
}: {
  readonly label: ReactNode;
  readonly value: string;
  readonly unit?: string;
  readonly delta?: number;
  readonly deltaFormatter?: (n: number) => string;
  readonly live?: boolean;
}): ReactNode {
  return (
    <div className={live ? `${styles.stat} ${styles.statLive}` : styles.stat}>
      <div className={styles.label}>{label}</div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {delta != null && deltaFormatter != null && delta !== 0 && (
        <div className={deltaClass(delta)}>
          <span aria-hidden="true">{delta > 0 ? "↑" : "↓"}</span>
          <span>
            {delta > 0 ? "+" : ""}
            {deltaFormatter(delta)}
          </span>
        </div>
      )}
    </div>
  );
}

function DailyGoalPill({
  value,
  goal,
  label,
  formattedTime,
}: {
  readonly value: number;
  readonly goal: number;
  readonly label: ReactNode;
  readonly formattedTime: string;
}): ReactNode {
  if (goal <= 0) {
    return (
      <div className={styles.stat}>
        <div className={styles.label}>{label}</div>
        <div className={styles.valueRow}>
          <span className={styles.valueMuted}>—</span>
        </div>
      </div>
    );
  }
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);
  const reached = value >= 1;
  return (
    <div className={styles.stat}>
      <div className={styles.label}>{label}</div>
      <div
        className={
          reached ? `${styles.pill} ${styles.pillReached}` : styles.pill
        }
        title={`${percent}% / ${formattedTime}`}
      >
        <div
          className={styles.pillFill}
          style={{ inlineSize: `${percent}%` }}
          aria-hidden="true"
        />
        <span className={styles.pillLabel}>
          {percent}% · {formattedTime}
        </span>
      </div>
    </div>
  );
}

function Separator(): ReactNode {
  return <div className={styles.separator} aria-hidden="true" />;
}

function deltaClass(delta: number): string {
  if (delta > 0) return `${styles.delta} ${styles.deltaUp}`;
  if (delta < 0) return `${styles.delta} ${styles.deltaDown}`;
  return styles.delta;
}
