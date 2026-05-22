import { Tasks } from "@keybr/lang";
import { type LessonKey } from "@keybr/lesson";
import {
  CurrentKey,
  DailyGoal,
  EffortLegend,
  KeySet,
  names,
  useEffort,
} from "@keybr/lesson-ui";
import { StreakList } from "@keybr/lesson-ui/lib/StreakList.tsx";
import { Popup, Portal } from "@keybr/widget";
import { memo, type ReactNode, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { BigramPanel } from "./BigramPanel.tsx";
import * as styles from "./Indicators.module.less";
import { KeyExtendedDetails } from "./KeyExtendedDetails.tsx";
import { MobileBanner } from "./MobileBanner.tsx";
import { RhythmPacer } from "./RhythmPacer.tsx";
import { type LessonState } from "./state/index.ts";
import { WarmupCard } from "./WarmupCard.tsx";

export const Indicators = memo(function Indicators({
  state,
  liveSpeed = null,
  tensionRatio = null,
  cadenceBaselineMs = null,
  cadenceDeviation = null,
}: {
  readonly state: LessonState;
  /**
   * Current typing speed in CPM, passed by the parent on every keystroke.
   * Indicators is memo'd on `state` (a stable ref), so this explicit prop
   * is needed for live updates to propagate.
   *
   * NOTE: in Focus Mode the CPM number is owned by the HUD (rendered by
   * another component). Kept here only because the prop is still passed
   * by Presenter and it informs whether the tension chip should render.
   */
  readonly liveSpeed?: number | null;
  /**
   * Current tension ratio (current dwell median / personal baseline).
   * Same memo-friendly explicit-prop pattern as liveSpeed.
   */
  readonly tensionRatio?: number | null;
  /**
   * Personal cadence baseline (ms per keystroke). For the rhythm pacer.
   */
  readonly cadenceBaselineMs?: number | null;
  /**
   * Cadence deviation in [-1, 1] from baseline. For the rhythm pacer.
   */
  readonly cadenceDeviation?: number | null;
}): ReactNode {
  const { formatMessage } = useIntl();
  const effort = useEffort();
  const { keyStatsMap, lessonKeys, streakList, dailyGoal } = state;
  type State = Readonly<
    | { type: "hidden" }
    | { type: "visible-in"; key: LessonKey; elem: Element }
    | { type: "visible"; key: LessonKey; elem: Element }
    | { type: "visible-out"; key: LessonKey; elem: Element }
  >;
  const [hover, setHover] = useState<State>({ type: "hidden" });
  useEffect(() => {
    const tasks = new Tasks();
    switch (hover.type) {
      case "visible-in":
        tasks.delayed(300, () => {
          setHover({ ...hover, type: "visible" });
        });
        break;
      case "visible-out":
        tasks.delayed(300, () => {
          setHover({ type: "hidden" });
        });
        break;
    }
    return () => {
      tasks.cancelAll();
    };
  }, [hover]);
  return (
    <div id={names.indicators} className={styles.rail}>
      <MobileBanner />
      <WarmupCard />
      {tensionRatio != null && (
        <div className={styles.tensionStrip} aria-live="off">
          <span className={tensionClass(tensionRatio)}>
            {tensionLabel(tensionRatio)}
          </span>
        </div>
      )}
      <RhythmPacer
        baselineMs={cadenceBaselineMs}
        deviation={cadenceDeviation}
      />

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          {formatMessage({
            id: "t_Current_key",
            defaultMessage: "Current key",
          })}
        </div>
        <div className={styles.cardBody}>
          <CurrentKey
            id={names.currentKey}
            className={styles.currentKey}
            lessonKeys={lessonKeys}
          />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          {formatMessage({
            id: "t_All_keys",
            defaultMessage: "All keys",
          })}
        </div>
        <div className={styles.cardBody}>
          <KeySet
            id={names.keySet}
            className={styles.keySet}
            lessonKeys={lessonKeys}
            onKeyHoverIn={(key, elem) => {
              setHover({ type: "visible-in", key, elem });
            }}
            onKeyHoverOut={() => {
              switch (hover.type) {
                case "visible-in":
                  setHover({ type: "hidden" });
                  break;
                case "visible":
                  setHover({ ...hover, type: "visible-out" });
                  break;
              }
            }}
          />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          {formatMessage({
            id: "t_Accuracy",
            defaultMessage: "Accuracy",
          })}
        </div>
        <div className={styles.cardBody}>
          <StreakList
            id={names.streakList}
            className={styles.streakList}
            streakList={streakList}
          />
        </div>
      </section>

      {dailyGoal.goal > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            {formatMessage({
              id: "t_Daily_goal",
              defaultMessage: "Daily goal",
            })}
          </div>
          <div className={styles.cardBody}>
            <DailyGoal
              id={names.dailyGoal}
              className={styles.dailyGoal}
              dailyGoal={dailyGoal}
            />
          </div>
        </section>
      )}

      {state.lastLesson != null && (
        <section className={styles.card}>
          <div className={styles.cardBody}>
            <BigramPanel bigramStats={state.lastLesson.bigramStats} />
          </div>
        </section>
      )}

      {dailyGoal.goal > 0 && (
        <div className={styles.effortLegend}>
          <EffortLegend effort={effort} />
        </div>
      )}

      {(hover.type === "visible" || hover.type === "visible-out") && (
        <Portal>
          <Popup
            anchor={hover.elem}
            onMouseEnter={() => {
              setHover({ ...hover, type: "visible" });
            }}
            onMouseLeave={() => {
              setHover({ ...hover, type: "visible-out" });
            }}
          >
            <KeyExtendedDetails
              lessonKey={hover.key}
              keyStats={keyStatsMap.get(hover.key.letter)}
            />
          </Popup>
        </Portal>
      )}
    </div>
  );

  function tensionLabel(r: number): string {
    if (r < 0.9) return "loose";
    if (r < 1.1) return "relaxed";
    if (r < 1.25) return "firm";
    return "tight";
  }

  function tensionClass(r: number): string {
    if (r >= 1.25) return styles.tensionTight;
    if (r >= 1.1) return styles.tensionFirm;
    return styles.tensionRelaxed;
  }
});
