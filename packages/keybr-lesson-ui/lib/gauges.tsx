import { useIntlNumbers } from "@keybr/intl";
import { type SummaryStats } from "@keybr/result";
import { type ClassName, Name, Value } from "@keybr/widget";
import { clsx } from "clsx";
import { memo, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { useFormatter } from "./format.ts";
import * as styles from "./gauges.module.less";
import { type Names } from "./names.ts";

export const GaugeList = memo(function GaugeRow({
  summaryStats,
  names,
}: {
  summaryStats: SummaryStats;
  names?: Names;
}) {
  return (
    <div className={styles.gaugeList}>
      <SpeedGauge summaryStats={summaryStats} names={names} />
      <AccuracyGauge summaryStats={summaryStats} names={names} />
      <ScoreGauge summaryStats={summaryStats} names={names} />
    </div>
  );
});

export const SpeedGauge = memo(function SpeedGauge({
  summaryStats,
  names,
}: {
  summaryStats: SummaryStats;
  names?: Names;
}) {
  const { formatMessage } = useIntl();
  const { formatSpeed } = useFormatter();
  const { last, delta } = summaryStats.speed;
  return (
    <Gauge
      id={names?.speed}
      name={
        <Name
          name={formatMessage({
            id: "t_Speed",
            defaultMessage: "Speed",
          })}
        />
      }
      value={<Value value={formatSpeed(last)} />}
      delta={delta}
      deltaText={formatSpeed(delta)}
      deltaTitle={formatMessage({
        id: "metric.difference.description",
        defaultMessage: "The difference from the average value.",
      })}
      title={formatMessage({
        id: "metric.speed.description",
        defaultMessage: "Typing speed in the last lesson.",
      })}
    />
  );
});

export const AccuracyGauge = memo(function AccuracyGauge({
  summaryStats,
  names,
}: {
  summaryStats: SummaryStats;
  names?: Names;
}) {
  const { formatMessage } = useIntl();
  const { formatPercents } = useIntlNumbers();
  const { last, delta } = summaryStats.accuracy;
  return (
    <Gauge
      id={names?.accuracy}
      name={
        <Name
          name={formatMessage({
            id: "t_Accuracy",
            defaultMessage: "Accuracy",
          })}
        />
      }
      value={<Value value={formatPercents(last)} />}
      delta={delta}
      deltaText={formatPercents(delta)}
      deltaTitle={formatMessage({
        id: "metric.difference.description",
        defaultMessage: "The difference from the average value.",
      })}
      title={formatMessage({
        id: "metric.accuracy.description",
        defaultMessage:
          "The percentage of characters typed without errors in the last lesson.",
      })}
    />
  );
});

export const ScoreGauge = memo(function ScoreGauge({
  summaryStats,
  names,
}: {
  summaryStats: SummaryStats;
  names?: Names;
}) {
  const { formatMessage } = useIntl();
  const { formatNumber } = useIntlNumbers();
  const { last, delta } = summaryStats.score;
  return (
    <Gauge
      id={names?.score}
      name={
        <Name
          name={formatMessage({
            id: "t_Score",
            defaultMessage: "Score",
          })}
        />
      }
      value={<Value value={formatNumber(last, 0)} />}
      delta={delta}
      deltaText={formatNumber(delta, 0)}
      deltaTitle={formatMessage({
        id: "metric.difference.description",
        defaultMessage: "The difference from the average value.",
      })}
      title={formatMessage({
        id: "metric.score.description",
        defaultMessage:
          "Score of the last lesson in abstract points. " +
          "Scores are greater when you type faster and with fewer errors.",
      })}
    />
  );
});

export const Gauge = memo(function Gauge({
  id,
  className,
  name,
  value,
  delta,
  deltaText,
  deltaTitle,
  title,
}: {
  id?: string;
  className?: ClassName;
  name: ReactNode;
  value: ReactNode;
  // Backwards-compatible: callers can pass a number (preferred, used for
  // styling the delta arrow + color) or a fully-built ReactNode.
  delta: number | ReactNode;
  deltaText?: string;
  deltaTitle?: string;
  title: string;
}) {
  const deltaContent =
    typeof delta === "number" && deltaText != null ? (
      <DeltaIndicator delta={delta} text={deltaText} title={deltaTitle} />
    ) : (
      delta
    );
  return (
    <span id={id} className={clsx(styles.gauge, className)} title={title}>
      <span className={styles.gaugeMain}>
        {name}
        <span className={styles.gaugeValue}>{value}</span>
      </span>
      {deltaContent}
    </span>
  );
});

function DeltaIndicator({
  delta,
  text,
  title,
}: {
  delta: number;
  text: string;
  title?: string;
}) {
  const sign = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "";
  const prefix = delta > 0 ? "+" : "";
  return (
    <span
      className={clsx(
        styles.gaugeDelta,
        sign === "positive" && styles.gaugeDeltaPositive,
        sign === "negative" && styles.gaugeDeltaNegative,
        sign === "neutral" && styles.gaugeDeltaNeutral,
      )}
      title={title}
    >
      {arrow && <span className={styles.gaugeDeltaArrow}>{arrow}</span>}
      <span>
        {prefix}
        {text}
      </span>
    </span>
  );
}
