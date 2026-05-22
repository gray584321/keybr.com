import { useIntlNumbers } from "@keybr/intl";
import { FormattedMessage, useIntl } from "react-intl";
import { type Effort } from "./effort.ts";
import * as styles from "./EffortLegent.module.less";

const BANDS = [1.0, 0.75, 0.5, 0.25, 0.0] as const;

export function EffortLegend({ effort }: { effort: Effort }) {
  const { formatMessage } = useIntl();
  const { formatPercents } = useIntlNumbers();
  const tooltip = formatMessage({
    id: "effortLegend.bandDescription",
    defaultMessage:
      "The fraction of your daily goal that this colour band represents.",
  });
  return (
    <span className={styles.root}>
      <span className={styles.label}>
        <FormattedMessage id="t_Daily_goal:" defaultMessage="Daily goal:" />
      </span>
      {BANDS.map((value) => (
        <span key={value} className={styles.cell} title={tooltip}>
          <span
            className={styles.item}
            style={{ backgroundColor: String(effort.shade(value)) }}
          >
            {formatPercents(value)}
          </span>
        </span>
      ))}
    </span>
  );
}
