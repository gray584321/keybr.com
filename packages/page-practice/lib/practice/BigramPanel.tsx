import { type BigramStatsMap, findSlowestBigrams } from "@keybr/result";
import { type ReactNode } from "react";
import * as styles from "./BigramPanel.module.less";

/**
 * Post-lesson display of the user's slowest bigrams in the just-completed
 * session, ranked by `timeToType / bestTimeToType` ratio.
 *
 * Hidden when no usable bigram data is available (e.g. very short lesson,
 * all values rejected by the &lt;15ms / &gt;12s guard, or empty map).
 */
export function BigramPanel({
  bigramStats,
  limit = 5,
}: {
  readonly bigramStats: BigramStatsMap;
  readonly limit?: number;
}): ReactNode {
  const slowest = findSlowestBigrams(bigramStats, limit).filter(
    (s) => s.timeToType != null,
  );
  if (slowest.length === 0) return null;
  return (
    <div className={styles.panel}>
      <div className={styles.heading}>Slowest bigrams (this lesson)</div>
      <table className={styles.table}>
        <tbody>
          {slowest.map((s) => {
            const key = String.fromCodePoint(s.bigram.first, s.bigram.second);
            const ms = Math.round(s.timeToType ?? 0);
            const bestMs = Math.round(s.bestTimeToType ?? 0);
            return (
              <tr key={key} className={styles.row}>
                <td className={styles.bigram}>{key}</td>
                <td className={styles.value}>{ms} ms</td>
                <td className={styles.best}>best {bestMs} ms</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
