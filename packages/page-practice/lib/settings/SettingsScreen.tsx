import { KeyboardProvider } from "@keybr/keyboard";
import { Screen } from "@keybr/pages-shared";
import { SettingsContext, useSettings } from "@keybr/settings";
import { TypingSettings } from "@keybr/textinput-ui";
import {
  Button,
  ExplainerBoundary,
  Icon,
  Tab,
  TabList,
  useView,
} from "@keybr/widget";
import { mdiCheckCircle, mdiDeleteForever } from "@mdi/js";
import { type ReactNode, useState } from "react";
import { useIntl } from "react-intl";
import { views } from "../views.tsx";
import { ExplainSettings } from "./ExplainSettings.tsx";
import { KeyboardSettings } from "./KeyboardSettings.tsx";
import { LessonSettings } from "./LessonSettings.tsx";
import { MiscSettings } from "./MiscSettings.tsx";
import * as styles from "./SettingsScreen.module.less";

export function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const { setView } = useView(views);
  const [newSettings, updateNewSettings] = useState(settings);
  return (
    <SettingsContext.Provider
      value={{
        settings: newSettings,
        updateSettings: updateNewSettings,
      }}
    >
      <KeyboardProvider>
        <Content
          onSubmit={() => {
            updateSettings(newSettings);
            setView("practice");
          }}
        />
      </KeyboardProvider>
    </SettingsContext.Provider>
  );
}

function Content({ onSubmit }: { readonly onSubmit: () => void }) {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  const [tabIndex, setTabIndex] = useState(0);

  const tabs: ReadonlyArray<{ label: string; body: ReactNode }> = [
    {
      label: formatMessage({ id: "t_Lessons", defaultMessage: "Lessons" }),
      body: <LessonSettings />,
    },
    {
      label: formatMessage({ id: "t_Typing", defaultMessage: "Typing" }),
      body: <TypingSettings />,
    },
    {
      label: formatMessage({ id: "t_Keyboard", defaultMessage: "Keyboard" }),
      body: <KeyboardSettings />,
    },
    {
      label: formatMessage({
        id: "t_Miscellaneous",
        defaultMessage: "Miscellaneous",
      }),
      body: <MiscSettings />,
    },
  ];

  return (
    <Screen className={styles.screen}>
      <ExplainerBoundary>
        <div className={styles.shell}>
          <header className={styles.header}>
            <div className={styles.headerActions}>
              <ExplainSettings />
            </div>
          </header>

          <div className={styles.tabBar}>
            <TabList
              selectedIndex={tabIndex}
              onSelect={(index) => {
                setTabIndex(index);
              }}
            >
              {tabs.map((tab, index) => (
                <Tab key={index} label={tab.label} />
              ))}
            </TabList>
          </div>

          <div className={styles.body}>
            <div className={styles.bodyInner}>{tabs[tabIndex].body}</div>
          </div>

          <div className={styles.footer}>
            <Button
              size={16}
              icon={<Icon shape={mdiDeleteForever} />}
              label={formatMessage({
                id: "t_Reset",
                defaultMessage: "Reset",
              })}
              onClick={() => {
                updateSettings(settings.reset());
              }}
            />
            <Button
              size={16}
              icon={<Icon shape={mdiCheckCircle} />}
              label={formatMessage({
                id: "t_Done",
                defaultMessage: "Done",
              })}
              onClick={() => {
                onSubmit();
              }}
            />
          </div>
        </div>
      </ExplainerBoundary>
    </Screen>
  );
}
