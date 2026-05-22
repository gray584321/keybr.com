import { SpeedUnit, uiProps } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Description, Explainer, FieldSet, OptionList } from "@keybr/widget";
import { type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import * as styles from "./SettingsLayout.module.less";

export function MiscSettings(): ReactNode {
  const { formatMessage } = useIntl();
  return (
    <>
      <FieldSet
        className={styles.section}
        legend={formatMessage({
          id: "t_Interface_options",
          defaultMessage: "Interface options",
        })}
      >
        <SpeedUnitProp />
      </FieldSet>
    </>
  );
}

function SpeedUnitProp(): ReactNode {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  return (
    <>
      <div className={styles.grid}>
        <div className={styles.label}>
          <FormattedMessage
            id="t_Measure_typing_speed_in:"
            defaultMessage="Measure typing speed in:"
          />
        </div>
        <div className={styles.control}>
          <OptionList
            options={SpeedUnit.ALL.map((item) => ({
              value: item.id,
              name: formatMessage(item.name),
            }))}
            value={settings.get(uiProps.speedUnit).id}
            onSelect={(id) => {
              updateSettings(
                settings.set(uiProps.speedUnit, SpeedUnit.ALL.get(id)),
              );
            }}
          />
        </div>
      </div>
      <Explainer>
        <Description>
          <FormattedMessage
            id="settings.typingSpeedUnit.description"
            defaultMessage="For the purpose of typing measurement, each word is standardized to be five characters or keystrokes in English, including spaces and punctuation."
          />
        </Description>
      </Explainer>
    </>
  );
}
