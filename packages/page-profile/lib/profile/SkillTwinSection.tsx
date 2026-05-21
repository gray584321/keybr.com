import { type KeyStats, type KeyStatsMap, timeToSpeed } from "@keybr/result";
import { Explainer, Figure } from "@keybr/widget";
import { FormattedMessage } from "react-intl";
import * as styles from "./SkillTwinSection.module.less";

const MIN_SAMPLES = 3;

/**
 * "Your typing twin" — surfaces the Glicko-2 ratings shipped in Sprint 8
 * as a self-portrait. Two numbers + two short tables:
 *
 *   - Current sustained CPM (mean of per-key filtered timeToType,
 *     converted to CPM and averaged).
 *   - Projected ceiling: what the user would type if every key were as
 *     fast as their best key.
 *   - 5 most uncertain keys (high RD) — where the system is still learning.
 *   - 5 strongest keys (high rating, low RD) — what's already mastered.
 */
export function SkillTwinSection({
  keyStatsMap,
}: {
  keyStatsMap: KeyStatsMap;
}) {
  const stats = [...keyStatsMap].filter(
    (s) => s.timeToType != null && s.samples.length >= MIN_SAMPLES,
  );
  if (stats.length === 0) return null;

  const currentCpm = avgCpm(stats);
  const projectedCpm = projectedCeilingCpm(stats);
  const headroom = Math.max(0, Math.round(projectedCpm - currentCpm));

  const uncertain = [...stats]
    .filter((s) => s.rating != null)
    .sort((a, b) => b.rating!.rd - a.rating!.rd)
    .slice(0, 5);

  const strongest = [...stats]
    .filter((s) => s.rating != null && s.rating!.rd < 200)
    .sort((a, b) => b.rating!.rating - a.rating!.rating)
    .slice(0, 5);

  return (
    <Figure>
      <Figure.Caption>
        <FormattedMessage
          id="profile.skillTwin.caption"
          defaultMessage="Your Typing Twin"
        />
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage
            id="profile.skillTwin.description"
            defaultMessage="A self-portrait built from the per-key Glicko-2 ratings: how fast you sustain today, how fast you'd sustain if every finger were as quick as your best finger, and where the system is still learning you."
          />
        </Figure.Description>
      </Explainer>

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.label}>Current sustained</div>
          <div className={styles.value}>{Math.round(currentCpm)} CPM</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Projected ceiling</div>
          <div className={styles.value}>{Math.round(projectedCpm)} CPM</div>
          {headroom > 0 && (
            <div className={styles.headroom}>+{headroom} headroom</div>
          )}
        </div>
      </div>

      <div className={styles.lists}>
        <div className={styles.list}>
          <div className={styles.listTitle}>
            Still learning ({uncertain.length})
          </div>
          {uncertain.length === 0 ? (
            <div className={styles.empty}>—</div>
          ) : (
            <table className={styles.table}>
              <tbody>
                {uncertain.map((s) => (
                  <tr key={s.letter.codePoint}>
                    <td className={styles.letter}>{s.letter.label}</td>
                    <td className={styles.numeric}>
                      RD {Math.round(s.rating!.rd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.list}>
          <div className={styles.listTitle}>Strongest ({strongest.length})</div>
          {strongest.length === 0 ? (
            <div className={styles.empty}>—</div>
          ) : (
            <table className={styles.table}>
              <tbody>
                {strongest.map((s) => (
                  <tr key={s.letter.codePoint}>
                    <td className={styles.letter}>{s.letter.label}</td>
                    <td className={styles.numeric}>
                      rating {Math.round(s.rating!.rating)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Figure>
  );
}

function avgCpm(stats: readonly KeyStats[]): number {
  let sum = 0;
  let n = 0;
  for (const s of stats) {
    if (s.timeToType != null) {
      sum += timeToSpeed(s.timeToType);
      n += 1;
    }
  }
  return n > 0 ? sum / n : 0;
}

function projectedCeilingCpm(stats: readonly KeyStats[]): number {
  // If every key were as fast as the user's *best* key, what would the
  // overall sustained CPM look like?
  let bestTime = Infinity;
  for (const s of stats) {
    if (s.bestTimeToType != null && s.bestTimeToType < bestTime) {
      bestTime = s.bestTimeToType;
    }
  }
  return Number.isFinite(bestTime) ? timeToSpeed(bestTime) : 0;
}
