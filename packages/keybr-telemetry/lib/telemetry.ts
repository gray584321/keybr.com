/**
 * Anonymous telemetry events for the bigram / Glicko / motivation features.
 *
 * Payloads never include raw typed text — only aggregate numbers, opaque
 * hashes, and enum values. The default sink in non-browser contexts is a
 * no-op; in browsers it tries `navigator.sendBeacon` to a single endpoint
 * and falls back to console.debug if the endpoint is unavailable.
 *
 * The actual server endpoint is intentionally not part of this package —
 * a host application registers a sink via `setTelemetrySink`. This keeps
 * the package free of HTTP / fetch dependencies and lets each consumer
 * route events wherever is appropriate.
 */

export type TelemetryEvent =
  | { type: "bigram_lesson_start"; targetMode: string; bigramCount: number }
  | { type: "bigram_generation_fallback"; bigram: string; attemptCount: number }
  | { type: "letter_unlocked"; alphabetSize: number; accuracyAtUnlock: number }
  | { type: "confidence_threshold_crossed"; direction: "above" | "below" }
  | { type: "plateau_toast_shown"; consecutiveStalls: number }
  | { type: "micro_break_prompted"; sessionMinutes: number }
  | { type: "drill_complete"; sessionMinutes: number }
  | { type: "daily_goal_completed"; goalMinutes: number; actualMinutes: number }
  | { type: "sfb_heatmap_viewed"; sfbCount: number }
  | { type: "lesson_generated_timing"; lessonType: string; durationMs: number }
  | { type: "tension_detected"; tensionRatio: number }
  | { type: "plateau_drill_offered" }
  | { type: "plateau_drill_started" }
  | { type: "warmup_completed"; bigramCount: number }
  | { type: "rhythm_pacer_enabled" }
  | { type: "prose_lesson_generated"; topic: string; bigramCount: number }
  | { type: "prose_fallback_used"; reason: string }
  | { type: "thompson_explore"; bigram: string }
  | { type: "mobile_detected"; userAgent: string };

export type TelemetrySink = (event: TelemetryEvent) => void;

let activeSink: TelemetrySink = defaultSink;

/**
 * Override the default sink. Pass `null` to revert to the default no-op.
 * Hosts wire this once at startup (e.g. to forward to a real endpoint).
 */
export function setTelemetrySink(sink: TelemetrySink | null): void {
  activeSink = sink ?? defaultSink;
}

/** Emit a single event. Always synchronous and never throws. */
export function emit(event: TelemetryEvent): void {
  try {
    activeSink(event);
  } catch {
    // Telemetry must never break the host.
  }
}

function defaultSink(event: TelemetryEvent): void {
  // No-op in non-browser; console.debug in browser dev for visibility.
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[telemetry]", event.type, event);
  }
}
