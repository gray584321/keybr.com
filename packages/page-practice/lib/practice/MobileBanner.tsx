import { isMobileContext } from "@keybr/textinput-events";
import { Icon } from "@keybr/widget";
import { mdiCellphone, mdiClose } from "@mdi/js";
import { type ReactNode, useEffect, useState } from "react";
import * as styles from "./MobileBanner.module.less";

/**
 * Slim advisory tip shown when the user appears to be on a phone or
 * tablet (touch device + mobile UA). Soft-keyboard timing is too
 * noisy for keybr's adaptive engine to use reliably, so we surface
 * the limitation honestly rather than silently break.
 *
 * Visually: a single-line strip with a phone icon, terse copy, and a
 * "×" dismiss. Fades in to be less intrusive than the previous full
 * row.
 */
export function MobileBanner(): ReactNode {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobileContext()) {
      return undefined;
    }
    setIsMobile(true);
    // Defer setting `visible` so the CSS transition runs on mount.
    const t = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(t);
    };
  }, []);

  if (!isMobile || dismissed) return null;

  return (
    <div
      className={`${styles.banner} ${visible ? styles.bannerVisible : ""}`}
      role="status"
    >
      <span className={styles.iconSlot} aria-hidden="true">
        <Icon shape={mdiCellphone} />
      </span>
      <span className={styles.text}>
        Soft-keyboard timing is noisy — bigram tracking and rhythm coaching are
        disabled on phones. Per-key accuracy still works.
      </span>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <Icon shape={mdiClose} />
      </button>
    </div>
  );
}
