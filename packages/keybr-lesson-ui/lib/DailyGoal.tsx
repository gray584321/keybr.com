import { useIntlDurations, useIntlNumbers } from "@keybr/intl";
import { type DailyGoal as DailyGoalType } from "@keybr/lesson";
import { type ClassName, Value } from "@keybr/widget";
import { clsx } from "clsx";
import { useId } from "react";
import { useIntl } from "react-intl";
import * as styles from "./DailyGoal.module.less";

export type DailyGoalVariant = "ring" | "bar";

export const DailyGoal = ({
  id,
  className,
  dailyGoal,
  variant = "ring",
}: {
  id?: string;
  className?: ClassName;
  dailyGoal: DailyGoalType;
  variant?: DailyGoalVariant;
}) => {
  if (variant === "bar") {
    return (
      <span id={id} className={clsx(styles.rootBar, className)}>
        <DailyGoalLabel value={dailyGoal.value} goal={dailyGoal.goal} />
        <DailyGoalBar value={dailyGoal.value} />
      </span>
    );
  }
  return (
    <span id={id} className={clsx(styles.rootRing, className)}>
      <DailyGoalRing value={dailyGoal.value} goal={dailyGoal.goal} />
    </span>
  );
};

const DailyGoalLabel = ({ value, goal }: { value: number; goal: number }) => {
  const { formatPercents } = useIntlNumbers();
  const { formatDuration } = useIntlDurations();
  return (
    <Value
      value={`${formatPercents(value, 0)}/${formatDuration({ minutes: goal })}`}
    />
  );
};

const DailyGoalBar = ({ value }: { value: number }) => {
  value = Math.max(0, value);
  const barWidth = value > 1 ? 100 : Math.round(value * 100);
  const frameWidth = value > 1 ? Math.round((1 / value) * 100) : 100;
  return (
    <div className={styles.bar}>
      <div className={styles.barFill} style={{ inlineSize: `${barWidth}%` }} />
      <div
        className={styles.barFrame}
        style={{ inlineSize: `${frameWidth}%` }}
      />
    </div>
  );
};

const DailyGoalRing = ({ value, goal }: { value: number; goal: number }) => {
  const { formatPercents } = useIntlNumbers();
  const { formatDuration } = useIntlDurations();
  const { formatMessage } = useIntl();
  const safeValue = Math.max(0, value);
  const ratio = safeValue > 1 ? 1 : safeValue;
  // SVG ring geometry. 64px overall, 7px stroke gives a soft donut.
  const size = 64;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const titleId = useId();
  const isComplete = safeValue >= 1;
  const minutesDone = Math.round(safeValue * goal);
  const centerLabel =
    goal > 0 ? `${minutesDone}/${goal}m` : formatPercents(safeValue, 0);
  return (
    <span className={styles.ring} aria-labelledby={titleId} role="img">
      <span id={titleId} className={styles.ringSrLabel}>
        {formatMessage({
          id: "t_Daily_goal",
          defaultMessage: "Daily goal",
        })}{" "}
        {formatPercents(safeValue, 0)}
        {goal > 0 && ` (${formatDuration({ minutes: goal })})`}
      </span>
      <svg
        className={styles.ringSvg}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-hidden="true"
      >
        <circle
          className={styles.ringTrack}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className={clsx(
            styles.ringFill,
            isComplete && styles.ringFillComplete,
          )}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={styles.ringCenter}>
        <span className={styles.ringValue}>{centerLabel}</span>
      </span>
    </span>
  );
};
