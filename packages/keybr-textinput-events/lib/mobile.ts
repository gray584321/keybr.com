/**
 * Detect mobile / soft-keyboard input context. Soft keyboards fire
 * keydown/keyup with `event.code === ""` and `event.key === "Unidentified"`
 * for nearly every key — relying on per-character timing here is
 * unreliable (the OS quantizes timestamps, predictive text fires
 * compositionupdate events, swipe-to-type emits multi-char inputs).
 *
 * Used to suppress dwell-time and bigram-timing collection on mobile
 * so noisy data doesn't contaminate the user's per-key stats.
 */

export function isMobileContext(): boolean {
  if (typeof navigator === "undefined") return false;
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  const ua = navigator.userAgent || "";
  const uaHints = /Mobile|Android|iPhone|iPad|iPod/.test(ua);
  return touch && uaHints;
}

/**
 * True when a specific input event came from a soft keyboard (no
 * meaningful `code` field). Use at the event-handler level, not the
 * environment level — a desktop user with a touch screen attached
 * could see both kinds of events.
 */
export function isSoftKeyboardEvent(event: {
  readonly code?: string;
  readonly key?: string;
}): boolean {
  return !event.code || event.key === "Unidentified";
}
