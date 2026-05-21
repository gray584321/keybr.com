import { Tasks } from "@keybr/lang";
import { type LessonKey } from "@keybr/lesson";
import {
  CurrentKeyRow,
  DailyGoalRow,
  GaugeRow,
  KeySetRow,
  names,
  StreakListRow,
} from "@keybr/lesson-ui";
import { Popup, Portal } from "@keybr/widget";
import { memo, type ReactNode, useEffect, useState } from "react";
import * as styles from "./Indicators.module.less";
import { KeyExtendedDetails } from "./KeyExtendedDetails.tsx";
import { type LessonState } from "./state/index.ts";

export const Indicators = memo(function Indicators({
  state,
  liveSpeed = null,
}: {
  readonly state: LessonState;
  /**
   * Current typing speed in CPM, passed by the parent on every keystroke.
   * Indicators is memo'd on `state` (a stable ref), so this explicit prop
   * is needed for live updates to propagate.
   */
  readonly liveSpeed?: number | null;
}): ReactNode {
  const { keyStatsMap, summaryStats, lessonKeys, streakList, dailyGoal } =
    state;
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
    <div id={names.indicators} className={styles.indicators}>
      <div
        className={
          liveSpeed != null
            ? styles.liveSpeed
            : `${styles.liveSpeed} ${styles.liveSpeedDim}`
        }
        aria-live="off"
      >
        {liveSpeed != null ? `${liveSpeed} CPM` : "— CPM"}
      </div>
      <GaugeRow summaryStats={summaryStats} names={names} />
      <KeySetRow
        lessonKeys={lessonKeys}
        names={names}
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
      <CurrentKeyRow lessonKeys={lessonKeys} names={names} />
      <StreakListRow streakList={streakList} names={names} />
      {dailyGoal.goal > 0 && (
        <DailyGoalRow dailyGoal={dailyGoal} names={names} />
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
});
