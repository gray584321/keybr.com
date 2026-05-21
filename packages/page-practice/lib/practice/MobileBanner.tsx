import { isMobileContext } from "@keybr/textinput-events";
import { type ReactNode, useEffect, useState } from "react";
import * as styles from "./MobileBanner.module.less";

/**
 * Small advisory banner shown when the user appears to be on a phone
 * or tablet (touch device + mobile UA). Soft-keyboard timing is too
 * noisy for keybr's adaptive engine to use reliably, so we surface
 * the limitation honestly rather than silently break.
 */
export function MobileBanner(): ReactNode {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setIsMobile(isMobileContext());
  }, []);
  if (!isMobile || dismissed) return null;
  return (
    <div className={styles.banner} role="status">
      <span>
        keybr&apos;s adaptive engine is calibrated for hardware keyboards. On
        phones the timing data is noisy, so bigram tracking and rhythm coaching
        are disabled. You can still practice — your per-key accuracy is the only
        signal in use.
      </span>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
