import { booleanProp, Preferences } from "@keybr/settings";
import { Button, useExplainerState } from "@keybr/widget";
import { type ReactNode, useLayoutEffect } from "react";
import { useIntl } from "react-intl";

const propExplainSettings = booleanProp("prefs.settings.explain", true);

export function ExplainSettings(): ReactNode {
  const { formatMessage } = useIntl();
  const { explainersVisible, toggleExplainers } = useExplainerState();
  useLayoutEffect(() => {
    toggleExplainers(Preferences.get(propExplainSettings));
  });
  return (
    <Button
      onClick={() => {
        toggleExplainers(!explainersVisible);
        Preferences.set(propExplainSettings, !explainersVisible);
      }}
    >
      {explainersVisible
        ? `▼ ${formatMessage({
            id: "t_Hide_explanations",
            defaultMessage: "Hide explanations",
          })}`
        : `► ${formatMessage({
            id: "t_Explain_settings",
            defaultMessage: "Explain settings",
          })}`}
    </Button>
  );
}
