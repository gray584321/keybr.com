import { useIntlNumbers } from "@keybr/intl";
import { type StreakList as StreakListType } from "@keybr/result";
import { type ClassName } from "@keybr/widget";
import { clsx } from "clsx";
import { FormattedMessage, useIntl } from "react-intl";
import * as styles from "./styles.module.less";

export const StreakList = ({
  id,
  className,
  streakList,
}: {
  id?: string;
  className?: ClassName;
  streakList: StreakListType;
}) => {
  const { formatMessage } = useIntl();
  const { formatPercents } = useIntlNumbers();
  const pills: Array<{ level: number; count: number }> = [];
  for (const { level, results } of streakList) {
    if (results.length > 0) {
      pills.push({ level, count: results.length });
    }
  }
  return (
    <span id={id} className={clsx(styles.streakList, className)}>
      {pills.length === 0 ? (
        <span className={clsx(styles.streakPill, styles.streakPillEmpty)}>
          <FormattedMessage
            id="streakList.noStreaks"
            defaultMessage="No accuracy streaks."
          />
        </span>
      ) : (
        pills.map(({ level, count }) => {
          const tooltip = formatMessage(
            {
              id: "streakList.streakLength",
              defaultMessage:
                "{length, plural, =1 {One lesson} other {# lessons}} with {accuracy} accuracy.",
            },
            {
              length: count,
              accuracy: formatPercents(level),
            },
          );
          return (
            <span key={level} className={styles.streakPill} title={tooltip}>
              <span className={styles.streakPillLength}>{count}</span>
              <span className={styles.streakPillSeparator}>·</span>
              <span>{formatPercents(level)}</span>
            </span>
          );
        })
      )}
    </span>
  );
};
