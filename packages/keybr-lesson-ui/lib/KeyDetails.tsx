import { LearningRate, type LessonKey, Target } from "@keybr/lesson";
import { timeToSpeed } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Name, NameValue, Value } from "@keybr/widget";
import { clsx } from "clsx";
import { useIntl } from "react-intl";
import { useFormatter } from "./format.ts";
import { Happiness } from "./Happiness.tsx";
import * as styles from "./styles.module.less";

export const KeyDetails = ({ lessonKey }: { lessonKey: LessonKey }) => {
  const { formatMessage } = useIntl();
  const { formatSpeed, formatConfidence, formatLearningRate, speedUnitName } =
    useFormatter();
  const { settings } = useSettings();
  const {
    letter: { label },
    timeToType,
    bestTimeToType,
    confidence,
    bestConfidence,
  } = lessonKey;
  if (
    timeToType != null &&
    bestTimeToType != null &&
    confidence != null &&
    bestConfidence != null
  ) {
    const learningRate =
      LearningRate.from(
        lessonKey.samples, //
        new Target(settings),
      )?.learningRate ?? null;
    return (
      <span
        className={clsx(
          styles.keyDetails,
          styles.keyDetails_root,
          styles.keyDetails_calibrated,
        )}
      >
        <span className={styles.keyDetails_statRow}>
          <NameValue
            name={
              <Name
                name={formatMessage({
                  id: "t_Last_speed",
                  defaultMessage: "Last speed",
                })}
              />
            }
            value={
              <Value>
                {`${formatSpeed(timeToSpeed(timeToType))}`}
                {` (${formatConfidence(confidence)})`}
              </Value>
            }
          />
        </span>
        <span className={styles.keyDetails_statRow}>
          <NameValue
            name={
              <Name
                name={formatMessage({
                  id: "t_Top_speed",
                  defaultMessage: "Top speed",
                })}
              />
            }
            value={
              <Value>
                {`${formatSpeed(timeToSpeed(bestTimeToType))}`}
                {` (${formatConfidence(bestConfidence)})`}
              </Value>
            }
          />
        </span>
        <span className={styles.keyDetails_statRow}>
          <NameValue
            name={
              <Name
                name={formatMessage({
                  id: "t_Learning_rate",
                  defaultMessage: "Learning rate",
                })}
              />
            }
            value={
              <Value
                value={
                  <>
                    {formatLearningRate(learningRate)}
                    {" "}
                    <Happiness learningRate={learningRate ?? 0} />
                  </>
                }
                delta={learningRate ?? 0}
              />
            }
          />
        </span>
      </span>
    );
  } else {
    return (
      <span
        className={clsx(
          styles.keyDetails,
          styles.keyDetails_root,
          styles.keyDetails_uncalibrated,
        )}
      >
        <span className={styles.keyDetails_uncalibratedNote}>
          {formatMessage({
            id: "t_Not_calibrated_",
            defaultMessage: "Not calibrated, need more samples.",
          })}
        </span>
      </span>
    );
  }
};
