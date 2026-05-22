import { Icon } from "@keybr/widget";
import { mdiEmoticonHappy, mdiEmoticonSad } from "@mdi/js";
import { clsx } from "clsx";
import * as styles from "./Happiness.module.less";

export function Happiness({ learningRate }: { learningRate: number }) {
  if (learningRate > 0) {
    return (
      <span className={clsx(styles.root, styles.happy)}>
        <Happy active={true} />
        <Happy active={learningRate >= +5} />
        <Happy active={learningRate >= +10} />
      </span>
    );
  }
  if (learningRate < 0) {
    return (
      <span className={clsx(styles.root, styles.sad)}>
        <Sad active={true} />
        <Sad active={learningRate <= -5} />
        <Sad active={learningRate <= -10} />
      </span>
    );
  }
  return null;
}

function Happy({ active = false }: { active?: boolean }) {
  return (
    <Icon
      className={clsx(styles.icon, active && styles.iconActive)}
      shape={mdiEmoticonHappy}
    />
  );
}

function Sad({ active = false }: { active?: boolean }) {
  return (
    <Icon
      className={clsx(styles.icon, active && styles.iconActive)}
      shape={mdiEmoticonSad}
    />
  );
}
