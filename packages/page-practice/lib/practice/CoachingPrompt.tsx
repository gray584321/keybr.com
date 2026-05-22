import { Icon, IconButton } from "@keybr/widget";
import { mdiClose, mdiLightbulbOnOutline } from "@mdi/js";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import * as styles from "./CoachingPrompt.module.less";

/**
 * Slide-in coaching card. Anchored to the bottom-right corner via CSS
 * (`position: fixed`), it appears when the coaching engine surfaces a
 * tip and slides offscreen when dismissed. Less interruptive than an
 * inline block because it stays out of the typing flow.
 *
 * The component is purely presentational: state and event sourcing
 * still live in `practice/coaching/` and `practice/state/`. This
 * component receives a `message`, optional `title`, and either an
 * `onDismiss` callback for manual dismissal or an `autoDismissMs`
 * value (default 8000ms) for automatic teardown.
 *
 * Mount/unmount is driven by the parent — when the parent unmounts
 * us the CSS keyframe is replaced by React's removal, which is the
 * desired "slide off" feel because the parent typically swaps content
 * rather than animating it out. If a smoother exit is needed later,
 * convert to a CSS transition driven by a `visible` prop.
 */
export function CoachingPrompt({
  title,
  message,
  icon,
  actions,
  onDismiss,
  autoDismissMs = 8000,
}: {
  /** Optional short heading, e.g. "Coach". */
  readonly title?: ReactNode;
  /** Required body content. Plain string or formatted ReactNode. */
  readonly message: ReactNode;
  /**
   * Optional leading icon element. Falls back to a lightbulb icon when
   * omitted.
   */
  readonly icon?: ReactNode;
  /** Optional trailing buttons row (e.g. "Try it", "Not now"). */
  readonly actions?: ReactNode;
  /** Manual dismiss handler. Always rendered as the "×" button. */
  readonly onDismiss?: () => void;
  /**
   * If non-null, auto-dismiss after this many milliseconds. Set to
   * `null` to disable auto-dismiss. Defaults to 8000ms.
   */
  readonly autoDismissMs?: number | null;
}): ReactNode {
  const headingId = useId();
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (autoDismissMs == null || autoDismissMs <= 0) return;
    const t = setTimeout(handleDismiss, autoDismissMs);
    return () => {
      clearTimeout(t);
    };
  }, [autoDismissMs, handleDismiss]);

  if (dismissed) return null;

  return (
    <aside
      className={styles.prompt}
      role="status"
      aria-live="polite"
      aria-labelledby={title != null ? headingId : undefined}
    >
      <div className={styles.iconSlot} aria-hidden="true">
        {icon ?? <Icon shape={mdiLightbulbOnOutline} />}
      </div>
      <div className={styles.body}>
        {title != null && (
          <div id={headingId} className={styles.title}>
            {title}
          </div>
        )}
        <div className={styles.message}>{message}</div>
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </div>
      <IconButton
        icon={<Icon shape={mdiClose} />}
        title="Dismiss"
        onClick={handleDismiss}
      />
    </aside>
  );
}
